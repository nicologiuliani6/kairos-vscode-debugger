import * as vscode from 'vscode';
import * as path from 'path';
import * as fs from 'fs';

export function activate(context: vscode.ExtensionContext) {
    // aggiungi queste due righe all'inizio
    //const adapterPath = path.join(__dirname, 'dapAdapter.js');
    //vscode.window.showInformationMessage(`Kairos: adapterPath=${adapterPath}`);

    // ── Comando: seleziona interprete Python ────────────────────────────
    const selectInterpreter = vscode.commands.registerCommand(
        'kairos.selectInterpreter',
        async () => {
            const current = vscode.workspace
                .getConfiguration('kairos')
                .get<string>('pythonPath', '');

            const choice = await vscode.window.showQuickPick(
                [
                    { label: '$(folder) Scegli file...', id: 'browse' },
                    { label: '$(close) Usa default (venv automatico)', id: 'default' },
                ],
                { placeHolder: `Interprete attuale: ${current || 'default'}` }
            );

            if (!choice) return;

            if (choice.id === 'default') {
                await vscode.workspace
                    .getConfiguration('kairos')
                    .update('pythonPath', '', vscode.ConfigurationTarget.Global);
                vscode.window.showInformationMessage('Kairos: interprete reimpostato al default.');
                return;
            }

            const uris = await vscode.window.showOpenDialog({
                canSelectFiles:    true,
                canSelectFolders:  false,
                canSelectMany:     false,
                openLabel:         'Seleziona interprete Python',
                filters: { 'Eseguibili': ['', 'exe'], 'Tutti i file': ['*'] },
            });

            if (!uris || uris.length === 0) return;

            const chosen = uris[0].fsPath;
            await vscode.workspace
                .getConfiguration('kairos')
                .update('pythonPath', chosen, vscode.ConfigurationTarget.Global);

            vscode.window.showInformationMessage(`Kairos: interprete impostato su ${chosen}`);
        }
    );

    // ── Comando: seleziona root progetto Kairos ─────────────────────────
    const selectRoot = vscode.commands.registerCommand(
        'kairos.selectRoot',
        async () => {
            const current = vscode.workspace
                .getConfiguration('kairos')
                .get<string>('projectRoot', '');

            const uris = await vscode.window.showOpenDialog({
                canSelectFiles: false,
                canSelectFolders: true,
                canSelectMany: false,
                openLabel: 'Seleziona root progetto Kairos',
            });

            if (!uris || uris.length === 0) return;

            const chosen = uris[0].fsPath;
            await vscode.workspace
                .getConfiguration('kairos')
                .update('projectRoot', chosen, vscode.ConfigurationTarget.Global);

            if (chosen !== current) {
                vscode.window.showInformationMessage(`Kairos: projectRoot impostato su ${chosen}`);
            }
        }
    );

    // ── Status bar ───────────────────────────────────────────────────────
    const statusBar = vscode.window.createStatusBarItem(
        vscode.StatusBarAlignment.Left, 100
    );
    statusBar.command = 'kairos.selectInterpreter';
    statusBar.tooltip = 'Clicca per cambiare interprete Python per Kairos';

    function updateStatusBar() {
        const p = vscode.workspace
            .getConfiguration('kairos')
            .get<string>('pythonPath', '');
        statusBar.text = `$(python) Kairos: ${p ? path.basename(p) : 'default'}`;
        statusBar.show();
    }

    updateStatusBar();
    vscode.workspace.onDidChangeConfiguration(e => {
        if (e.affectsConfiguration('kairos.pythonPath')) updateStatusBar();
    });

    // ── Factory DAP ──────────────────────────────────────────────────────
    const factory = new KairosDebugAdapterDescriptorFactory();
    const configProvider = new KairosDebugConfigurationProvider();
    context.subscriptions.push(
        vscode.debug.registerDebugAdapterDescriptorFactory('kairos', factory),
        vscode.debug.registerDebugConfigurationProvider('kairos', configProvider),
        selectInterpreter,
        selectRoot,
        statusBar,
    );
}

export function deactivate() {}

class KairosDebugAdapterDescriptorFactory
    implements vscode.DebugAdapterDescriptorFactory
{
    createDebugAdapterDescriptor(
        _session: vscode.DebugSession,
        _executable: vscode.DebugAdapterExecutable | undefined
    ): vscode.ProviderResult<vscode.DebugAdapterDescriptor> {
        const adapterPath = path.join(__dirname, 'dapAdapter.js');

        const config     = vscode.workspace.getConfiguration('kairos');
        const pythonPath = config.get<string>('pythonPath', '');
        const libPath    = config.get<string>('libPath', '');      // ← nuovo

        const env: { [key: string]: string } = {};
        for (const [k, v] of Object.entries(process.env)) {
            if (v !== undefined) env[k] = v;
        }
        if (pythonPath) env['KAIROS_PYTHON_PATH'] = pythonPath;
        if (libPath)    env['KAIROS_LIB_PATH']    = libPath;        // ← nuovo

        return new vscode.DebugAdapterExecutable('node', [adapterPath], { env });
    }
}

class KairosDebugConfigurationProvider
    implements vscode.DebugConfigurationProvider
{
    private fileExists(p: string): boolean {
        try {
            return fs.existsSync(p);
        } catch {
            return false;
        }
    }

    private appCandidatesFromRoot(root: string): string[] {
        return [
            path.join(root, 'packaging', 'linux', 'kairosapp'),
            path.join(root, 'build', 'dist', 'KairosApp'),
            path.join(root, 'build', 'KairosApp'),
            path.join(root, 'dist', 'KairosApp'),
            path.join(root, 'bin', 'KairosApp'),
            path.join(root, 'lib', 'KairosApp'),
            path.join(root, 'KairosApp'),
        ];
    }

    private libCandidatesFromRoot(root: string): string[] {
        return [
            path.join(root, 'build', 'libvm_dap.so'),
            path.join(root, 'dist', 'libvm_dap.so'),
            path.join(root, 'lib', 'libvm_dap.so'),
            path.join(root, 'libvm_dap.so'),
        ];
    }

    private appGlobalCandidates(): string[] {
        return [
            '/usr/local/bin/kairosapp',
            '/opt/kairosapp/KairosApp',
        ];
    }

    private libGlobalCandidates(): string[] {
        return [
            '/usr/local/lib/kairosapp/dap.so',
        ];
    }

    private firstExisting(paths: string[]): string | undefined {
        for (const p of paths) {
            if (this.fileExists(p)) return p;
        }
        return undefined;
    }

    private detectProjectRoot(activeFile: string): string | undefined {
        const folders = vscode.workspace.workspaceFolders ?? [];
        for (const wf of folders) {
            if (this.firstExisting(this.appCandidatesFromRoot(wf.uri.fsPath))) {
                return wf.uri.fsPath;
            }
        }

        if (activeFile) {
            let dir = path.dirname(activeFile);
            while (true) {
                if (this.firstExisting(this.appCandidatesFromRoot(dir))) {
                    return dir;
                }
                const parent = path.dirname(dir);
                if (parent === dir) break;
                dir = parent;
            }
        }

        return undefined;
    }

    resolveDebugConfiguration(
        _folder: vscode.WorkspaceFolder | undefined,
        config: vscode.DebugConfiguration
    ): vscode.ProviderResult<vscode.DebugConfiguration> {
        const kairosCfg = vscode.workspace.getConfiguration('kairos');
        const configuredApp = kairosCfg.get<string>('appPath', '').trim();
        const configuredRoot = kairosCfg.get<string>('projectRoot', '').trim();
        const configuredLib = kairosCfg.get<string>('libPath', '').trim();

        const activeFile = vscode.window.activeTextEditor?.document.uri.fsPath ?? '';
        const activeLang = vscode.window.activeTextEditor?.document.languageId ?? '';

        // Permette F5 senza launch.json: crea una config implicita
        // quando il file attivo e' Kairos.
        if (!config.type && !config.request && !config.name) {
            if (!activeFile || activeLang !== 'kairos') {
                vscode.window.showErrorMessage(
                    'Kairos: apri un file .kairos prima di avviare il debug senza launch.json.'
                );
                return undefined;
            }

            config.type = 'kairos';
            config.name = 'Kairos: Debug file corrente';
            config.request = 'launch';
            config.program = activeFile;
        }

        if (!config.program && activeFile && activeLang === 'kairos') {
            config.program = activeFile;
        }

        const detectedRoot = configuredRoot || this.detectProjectRoot(activeFile) || '';
        const appSearchCandidates = [
            ...(detectedRoot ? this.appCandidatesFromRoot(detectedRoot) : []),
            ...this.appGlobalCandidates(),
        ];
        const libSearchCandidates = [
            ...(detectedRoot ? this.libCandidatesFromRoot(detectedRoot) : []),
            ...this.libGlobalCandidates(),
        ];
        const detectedApp = this.firstExisting(appSearchCandidates);
        const detectedLib = this.firstExisting(libSearchCandidates);
        const configuredAppValid = configuredApp && this.fileExists(configuredApp) ? configuredApp : '';
        const configuredLibValid = configuredLib && this.fileExists(configuredLib) ? configuredLib : '';

        // Fallback automatico da settings/autodetect.
        if ((!config.kairosApp || !this.fileExists(config.kairosApp)) && configuredAppValid) {
            config.kairosApp = configuredAppValid;
        } else if (!config.kairosApp && detectedApp) {
            config.kairosApp = detectedApp;
        } else if (config.kairosApp && !this.fileExists(config.kairosApp) && detectedApp) {
            config.kairosApp = detectedApp;
        }
        if ((!config.kairosLib || !this.fileExists(config.kairosLib)) && configuredLibValid) {
            config.kairosLib = configuredLibValid;
        } else if (!config.kairosLib && detectedLib) {
            config.kairosLib = detectedLib;
        } else if (config.kairosLib && !this.fileExists(config.kairosLib) && detectedLib) {
            config.kairosLib = detectedLib;
        }

        // L'adapter richiede sempre kairosApp.
        if (!config.kairosApp || !this.fileExists(config.kairosApp)) {
            vscode.window.showErrorMessage(
                `Kairos (v0.1.1): non trovo KairosApp. Risolto="${config.kairosApp || ''}". ` +
                `Candidati=${appSearchCandidates.join(' | ')}`
            );
            return undefined;
        }

        return config;
    }
}