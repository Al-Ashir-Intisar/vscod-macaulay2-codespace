import * as vscode from "vscode";

let g_context: vscode.ExtensionContext | undefined;
let g_terminal: vscode.Terminal | undefined;

function startREPLCommand(context: vscode.ExtensionContext) {
    startREPL(false);
}

async function startREPL(preserveFocus: boolean) {
    console.log("function startREPL called...");
    if (g_terminal === undefined) {
        const config = vscode.workspace.getConfiguration("macaulay2");
        const exepath = config.get<string>("executablePath");
        const useWSLPaths = config.get<boolean>("useWSLPaths", false);

        const editor = vscode.window.activeTextEditor;
        if (!editor) {
            vscode.window.showErrorMessage("No active editor to start Macaulay2 REPL.");
            return;
        }

        let fullpath = editor.document.uri.fsPath;

        if (useWSLPaths) {
            // Convert Windows path (e.g. C:\Users\Admin\...) to WSL path (/mnt/c/Users/Admin/...)
            fullpath = fullpath.replace(/^([A-Z]):/, (_, d) => `/mnt/${d.toLowerCase()}`).replace(/\\/g, "/");
        }

        let dirarray = fullpath.split("/");
        dirarray.pop();
        let dirpath = dirarray.join("/");

        console.log(`Launching REPL with cwd: ${dirpath}`);
        g_terminal = vscode.window.createTerminal({
            name: "macaulay2",
            shellPath: exepath,
            shellArgs: [],
            env: {},
            cwd: dirpath
        });
    }
    g_terminal.show(preserveFocus);
}

async function executeCode(text: string) {
    if (!text.endsWith("\n")) {
        text = text + '\n';
    }

    await startREPL(true);
    g_terminal!.show(true);
    let lines = text.split(/\r?\n/).filter(line => line !== '');
    text = lines.join('\n');
    g_terminal!.sendText(text + '\n', false);
}

function executeSelection() {
    const editor = vscode.window.activeTextEditor;
    if (!editor) return;

    const selection = editor.selection;
    let text = selection.isEmpty
        ? editor.document.lineAt(selection.start.line).text
        : editor.document.getText(selection);

    if (selection.isEmpty) {
        for (let line = selection.start.line + 1; line < editor.document.lineCount; line++) {
            if (!editor.document.lineAt(line).isEmptyOrWhitespace) {
                const newPos = selection.active.with(line, editor.document.lineAt(line).range.end.character);
                const newSel = new vscode.Selection(newPos, newPos);
                editor.selection = newSel;
                break;
            }
        }
    }

    executeCode(text);
}

export function activate(context: vscode.ExtensionContext) {
    g_context = context;

    context.subscriptions.push(vscode.commands.registerCommand('macaulay2.startREPL', startREPLCommand));
    context.subscriptions.push(vscode.commands.registerCommand('macaulay2.sendToREPL', executeSelection));

    vscode.window.onDidCloseTerminal(terminal => {
        if (terminal === g_terminal) {
            g_terminal = undefined;
        }
    });
}
