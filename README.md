# Kairos VS Code Extension

Repository dedicata all'estensione VS Code di Kairos, con debugger DAP integrato.

Obiettivo:
- UX principale in VS Code (debug + language support).
- Supporto "leggero" per editor DAP compatibili, riusando l'adapter Node (`out/dapAdapter.js`).

## Descrizione

`Kairos VS Code Debugger` e' l'estensione ufficiale per sviluppare e fare debug di programmi Kairos dentro VS Code.
L'estensione collega l'editor al runtime Kairos tramite DAP, con supporto sia al debug classico sia alle operazioni di esecuzione inversa (step back / reverse continue), oltre a un supporto linguaggio base per file `.kairos`.

In pratica, questo progetto ti permette di:
- aprire e leggere codice Kairos con evidenziazione dedicata;
- lanciare il debug del file corrente anche senza `launch.json` (con fallback automatici);
- configurare in modo esplicito i path di `KairosApp` e `libvm_dap.so` quando il layout del progetto cambia;
- riutilizzare l'adapter DAP anche in editor diversi da VS Code.

## Cosa include

- Debugger DAP di tipo `kairos` (launch, breakpoints, step, step back, reverse continue).
- Evidenziazione sintassi base per file `.kairos`.
- Comandi VS Code per configurare interprete Python e impostazioni Kairos.
- Bridge verso runtime nativo (`libvm_dap.so`) e compilazione con `KairosApp --dap`.

## Architettura rapida

- `src/extension.ts`: integrazione VS Code (registrazione debugger, comandi, status bar).
- `src/dapAdapter.ts`: Debug Adapter Protocol server su stdio.
- `syntaxes/kairos.tmLanguage.json`: regole di syntax highlighting.
- `package.json`: contributi VS Code (language, debugger, grammar, settings, commands).

## Requisiti

- Node.js + npm
- VS Code (per usare l'estensione)
- Build Kairos disponibile in locale:
  - `KairosApp`
  - `libvm_dap.so`

## Sviluppo locale

Esegui dalla root di questa repo:

```bash
npm install
make compile
make package
make install
```

Comandi utili:
- `make watch`: build TypeScript in watch mode
- `make reinstall`: disinstalla + reinstalla l'estensione
- `make uninstall`: rimuove l'estensione da VS Code
- `make clean`: pulizia artefatti (`out`, `*.vsix`)

## Uso in VS Code

1. Apri un file `.kairos`.
2. Avvia il debug dal pannello Run and Debug.
3. (Opzionale) crea `./.vscode/launch.json` solo se vuoi configurazioni personalizzate per workspace.

Senza `launch.json`, l'estensione prova ad avviare automaticamente il file `.kairos` attivo.

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
      "kairosApp": "/path/to/kairos/build/dist/KairosApp",
      "kairosLib": "/path/to/kairos/build/libvm_dap.so"
    }
  ]
}
```

Campi chiave:
- `program`: file `.kairos` da eseguire (es. `${file}`)
- `kairosApp`: percorso dell'eseguibile Kairos compilato
- `kairosLib`: percorso della libreria DAP (`libvm_dap.so`)

Se `kairosApp` o `kairosLib` sono errati, la sessione di debug non parte.

### Modalita senza `launch.json`

Per evitare `./.vscode/launch.json` in ogni cartella:
- apri un file `.kairos`
- opzionalmente imposta `kairos.appPath` se il tuo `KairosApp` non e' in `build/dist`
- imposta `kairos.projectRoot` nelle impostazioni VS Code
- opzionalmente imposta `kairos.libPath` se vuoi forzare un percorso custom della libreria

In questo modo l'estensione ricava automaticamente:
- `kairosApp` da `kairos.appPath` oppure `<projectRoot>/build/dist/KairosApp`
- `kairosLib` da `kairos.libPath` oppure `<projectRoot>/build/libvm_dap.so`

### Come cambiare i path (KairosApp / libvm_dap.so)

Puoi configurare i percorsi in 3 modi, con questa priorita:

1. valori in `launch.json` (solo quella configurazione di debug)
2. impostazioni VS Code (`kairos.appPath`, `kairos.libPath`)
3. fallback da `kairos.projectRoot`

#### Opzione A: `settings.json` (consigliato se i path cambiano spesso)

Apri `Preferences: Open Settings (JSON)` e imposta:

```json
{
  "kairos.appPath": "/percorso/nuovo/KairosApp",
  "kairos.libPath": "/percorso/nuovo/libvm_dap.so"
}
```

Puoi salvarlo:
- nelle User Settings (valido globalmente)
- in `.vscode/settings.json` (valido solo per quella workspace)

#### Opzione B: `launch.json` (override per singolo progetto/config)

```json
{
  "version": "0.2.0",
  "configurations": [
    {
      "name": "Kairos custom",
      "type": "kairos",
      "request": "launch",
      "program": "${file}",
      "kairosApp": "/percorso/nuovo/KairosApp",
      "kairosLib": "/percorso/nuovo/libvm_dap.so"
    }
  ]
}
```

#### Opzione C: solo `projectRoot`

Con il comando `Kairos: Seleziona root progetto` imposti `kairos.projectRoot`, e l'estensione tenta:
- `KairosApp` in uno di questi path (primo trovato):
  - `<projectRoot>/build/dist/KairosApp`
  - `<projectRoot>/build/KairosApp`
  - `<projectRoot>/dist/KairosApp`
  - `<projectRoot>/bin/KairosApp`
  - `<projectRoot>/lib/KairosApp`
  - `<projectRoot>/KairosApp`
- `libvm_dap.so` in uno di questi path (se `kairos.libPath` non e' impostato):
  - `<projectRoot>/build/libvm_dap.so`
  - `<projectRoot>/dist/libvm_dap.so`
  - `<projectRoot>/lib/libvm_dap.so`
  - `<projectRoot>/libvm_dap.so`

## Supporto altri editor DAP (leggero)

Questa repo e' VS Code-first, ma l'adapter DAP e' avviabile anche fuori da VS Code:

- entrypoint adapter: `out/dapAdapter.js`
- protocollo: DAP su stdio (input `stdin`, output `stdout`)
- runtime richiesto: Node.js + accesso a `KairosApp` e `libvm_dap.so`

Per editor che supportano adapter custom DAP (es. Neovim, Emacs, altri client DAP), in genere basta configurare il comando:

```bash
node /absolute/path/to/out/dapAdapter.js
```

e passare nel `launch` gli stessi argomenti:
- `program`
- `kairosApp`
- `kairosLib`
- `stopOnEntry` (opzionale)

Nota: integrazioni language/UI (grammar, status bar, comandi) restano specifiche VS Code.

## Limiti attuali

- Highlighting volutamente minimale (keyword/operatori/commenti/numeri).
- Adapter orientato al flusso Kairos corrente (`KairosApp --dap` + `libvm_dap.so`).
- Supporto non-VSCode fornito a livello DAP, senza packaging dedicato per singolo editor.

## Supporto e troubleshooting

Se qualcosa non parte al primo colpo, questi sono i controlli principali:
- verifica che `KairosApp` esista ed sia eseguibile;
- verifica che `libvm_dap.so` esista nel path configurato;
- apri un file `.kairos` prima di lanciare il debug senza `launch.json`;
- se usi fallback automatici, imposta `kairos.projectRoot` con `Kairos: Seleziona root progetto`;
- se il tuo layout e' custom, imposta direttamente `kairos.appPath` e `kairos.libPath`.

Per segnalare bug o richieste:
- apri una issue nel repository;
- includi OS, versione estensione, `launch.json`/`settings.json` (senza dati sensibili), e messaggio di errore completo.
