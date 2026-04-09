# Kairos VS Code Extension

Estensione ufficiale per debug Kairos in VS Code tramite DAP.

## Prerequisiti runtime

Con installazione via `.deb`, i path standard sono:

- `KairosApp`: `/usr/local/bin/kairosapp` (symlink a `/opt/kairosapp/KairosApp`)
- `dap.so`: `/usr/local/lib/kairosapp/dap.so`

Verifica rapida:

```bash
ls -l /usr/local/bin/kairosapp /opt/kairosapp/KairosApp /usr/local/lib/kairosapp/dap.so
```

## Sviluppo estensione (solo make)

Dalla root `kairos-vscode-extension`:

```bash
make compile
make package
make install
```

Comandi utili:

- `make reinstall`: disinstalla + reinstalla l'estensione
- `make uninstall`: disinstalla `nico.kairos-vscode-debugger`
- `make watch`: TypeScript in watch mode
- `make clean`: pulizia `out/` e `*.vsix`

## Uso in VS Code

1. Apri un file `.kairos`
2. Avvia debug da Run and Debug
3. Se necessario, fai `Developer: Reload Window` dopo `make reinstall`

## Configurazione path

Con installazione standard `.deb`, di norma non devi impostare niente: l'estensione usa i default gia' preconfigurati.

Priorita risoluzione:

1. `launch.json` (`kairosApp`, `kairosLib`)
2. settings (`kairos.appPath`, `kairos.libPath`) se i path esistono
3. autodetect da workspace/projectRoot
4. fallback globali Linux (`/usr/local/bin/kairosapp`, `/opt/kairosapp/KairosApp`, `/usr/local/lib/kairosapp/dap.so`)

Esempio `settings.json`:

```json
{
  "kairos.appPath": "/usr/local/bin/kairosapp",
  "kairos.libPath": "/usr/local/lib/kairosapp/dap.so"
}
```

Esempio `launch.json`:

```json
{
  "version": "0.2.0",
  "configurations": [
    {
      "name": "Kairos: Debug file corrente",
      "type": "kairos",
      "request": "launch",
      "program": "${file}",
      "kairosApp": "/usr/local/bin/kairosapp",
      "kairosLib": "/usr/local/lib/kairosapp/dap.so"
    }
  ]
}
```

## Troubleshooting veloce

Se vedi "non trovo KairosApp":

1. verifica i file runtime con il comando `ls -l` sopra
2. rimuovi path vecchi in `launch.json`/settings
3. esegui `make reinstall`
4. fai `Developer: Reload Window`
