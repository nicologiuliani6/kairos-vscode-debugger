# Kairos VS Code Extension

Estensione ufficiale per debug Kairos in VS Code tramite DAP.

## Installazione

Una riga, senza sudo (installa nell'editor del tuo utente: VS Code, VSCodium o
Cursor, quelli presenti):

```bash
curl -fsSL https://github.com/nicologiuliani6/kairos-vscode-debugger/releases/latest/download/install.sh | bash
```

Lo script scarica il `.vsix` dell'ultima release e lo installa con
`code --install-extension`. Con `./install.sh v0.2.1` installa una versione
precisa, con `./install.sh file.vsix` un file gia' scaricato. Ogni release
allega il `.vsix` e `install.sh`.

## Prerequisiti runtime

Con installazione via `.deb`, i path standard sono:

- `kairos`: `/usr/local/bin/kairos` (symlink a `/opt/kairos/kairos`)
- `dap.so`: `/usr/local/lib/kairos/dap.so`

Verifica rapida:

```bash
ls -l /usr/local/bin/kairos /opt/kairos/kairos /usr/local/lib/kairos/dap.so
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
4. fallback globali Linux (`/usr/local/bin/kairos`, `/opt/kairos/kairos`, `/usr/local/lib/kairos/dap.so`; anche i percorsi del vecchio pacchetto `kairosapp`)

Esempio `settings.json`:

```json
{
  "kairos.appPath": "/usr/local/bin/kairos",
  "kairos.libPath": "/usr/local/lib/kairos/dap.so"
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
      "kairosApp": "/usr/local/bin/kairos",
      "kairosLib": "/usr/local/lib/kairos/dap.so"
    }
  ]
}
```

## Troubleshooting veloce

Se vedi "non trovo kairos":

1. verifica i file runtime con il comando `ls -l` sopra
2. rimuovi path vecchi in `launch.json`/settings
3. esegui `make reinstall`
4. fai `Developer: Reload Window`
