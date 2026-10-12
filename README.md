# Kairos VS Code Debugger

VS Code support for [Kairos](https://github.com/nicologiuliani6/kairos), the reversible concurrent language: syntax highlighting for `.kairos` files and a debugger (Debug Adapter Protocol) that runs programs **forwards and backwards**.

- breakpoints, step, continue;
- **Step Back** and **Reverse Continue**: a step back runs the inverse of the previous instruction inside the Kairos interpreter (a completed `call` or `par` is undone as a whole, a `show` is undone by printing again);
- variables of the current frame, updated at every step;
- program output in the Debug Console.

## Installation

One line, without sudo (it installs into your user's editor: VS Code, VSCodium or Cursor, whichever are present):

```bash
curl -fsSL https://github.com/nicologiuliani6/kairos-vscode-debugger/releases/latest/download/install.sh | bash
```

The script downloads the `.vsix` of the latest release and installs it with `code --install-extension`. If Kairos (the `kairos` app and the debugger library `dap.so`) is not installed, it installs it first from the [Kairos releases](https://github.com/nicologiuliani6/kairos/releases); only that step asks for the sudo password.

Other forms:

```bash
./install.sh v0.2.2          # a specific release
./install.sh file.vsix       # a .vsix you already downloaded
code --install-extension kairos-vscode-debugger-<version>.vsix   # by hand
```

Every [release](https://github.com/nicologiuliani6/kairos-vscode-debugger/releases) ships the `.vsix` and `install.sh`.

## Requirements

The `kairos` package (installed by the script above if missing) provides:

| File | Path |
|---|---|
| Kairos app | `/usr/local/bin/kairos` (link to `/opt/kairos/kairos`) |
| debugger library | `/usr/local/lib/kairos/dap.so` |

Check:

```bash
ls -l /usr/local/bin/kairos /usr/local/lib/kairos/dap.so
```

## Usage

1. Open a `.kairos` file.
2. Press **F5** (or *Run and Debug → Kairos Debug*). Without a `launch.json` the extension debugs the current file.
3. Use the debug toolbar: Continue, Step Over, **Step Back**, **Reverse Continue**, Stop.

Stepping back is refused, with a message in the Debug Console, when it would cross the start of a procedure into its caller, inside the branches of a running `par`, or while stopped inside an `uncall` in progress.

## Configuration

With the standard packages nothing needs to be configured. Paths are resolved in this order:

1. `launch.json` (`kairosApp`, `kairosLib`);
2. settings `kairos.appPath`, `kairos.libPath`, if the files exist;
3. a Kairos source checkout (`kairos.projectRoot`, or the workspace): `build/dist/kairos`, `build/libvm_dap.so`;
4. the standard paths above (and those of the old `kairosapp` package).

`settings.json`:

```json
{
  "kairos.appPath": "/usr/local/bin/kairos",
  "kairos.libPath": "/usr/local/lib/kairos/dap.so"
}
```

`launch.json`:

```json
{
  "version": "0.2.0",
  "configurations": [
    {
      "name": "Kairos: Debug current file",
      "type": "kairos",
      "request": "launch",
      "program": "${file}",
      "kairosApp": "/usr/local/bin/kairos",
      "kairosLib": "/usr/local/lib/kairos/dap.so",
      "stopOnEntry": false
    }
  ]
}
```

| Setting | Default | Meaning |
|---|---|---|
| `kairos.appPath` | `/usr/local/bin/kairos` | Kairos executable |
| `kairos.libPath` | `/usr/local/lib/kairos/dap.so` | debugger library |
| `kairos.projectRoot` | — | Kairos source checkout (only when not using the package) |
| `kairos.pythonPath` | — | Python interpreter for a source checkout |

Commands: *Kairos: Select project root*, *Kairos: Select Python interpreter*.

## Troubleshooting

"kairos executable not found":

1. check the files with the `ls -l` above; if they are missing, run the install script;
2. remove old paths (for example `/usr/local/bin/kairosapp`) from `launch.json` and settings;
3. run *Developer: Reload Window*.

## Development

From the repository root:

```bash
npm install
make compile      # TypeScript → out/
make package      # .vsix
make install      # install the .vsix into VS Code
make reinstall    # uninstall + install
make watch        # recompile on save
make clean        # remove out/ and *.vsix
```

Pushing a tag `vX.Y.Z` builds the `.vsix` and attaches it, with `install.sh`, to the GitHub release (`.github/workflows/release.yml`).
