// VS Code Extension for openPly v0.2.0
// Inline chat, code actions, webview panel, statusbar integration

import * as vscode from 'vscode'
import { exec } from 'child_process'
import { promisify } from 'util'

const execAsync = promisify(exec)

let statusBarItem: vscode.StatusBarItem
let outputChannel: vscode.OutputChannel
let currentModel = 'deepseek/deepseek-v4-flash'
let currentMode: 'plan' | 'build' = 'build'

export function activate(context: vscode.ExtensionContext) {
  outputChannel = vscode.window.createOutputChannel('openPly')
  statusBarItem = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Right, 100)
  updateStatusBar()
  statusBarItem.show()

  // --- Commands ---

  context.subscriptions.push(
    vscode.commands.registerCommand('openply.start', startInTerminal),
    vscode.commands.registerCommand('openply.chat', openChat),
    vscode.commands.registerCommand('openply.explain', explainSelected),
    vscode.commands.registerCommand('openply.refactor', refactorSelected),
    vscode.commands.registerCommand('openply.addTests', addTestsForFile),
    vscode.commands.registerCommand('openply.fixDiagnostics', fixDiagnostics),
    vscode.commands.registerCommand('openply.toggleMode', toggleMode),
    vscode.commands.registerCommand('openply.selectModel', selectModel),
    vscode.commands.registerCommand('openply.showOutput', () => outputChannel.show()),
    vscode.commands.registerCommand('openply.webview', openWebviewPanel),
  )

  // --- Code Actions Provider ---

  context.subscriptions.push(
    vscode.languages.registerCodeActionsProvider(
      { scheme: 'file' },
      new OpenPLYCodeActionProvider(),
      { providedCodeActionKinds: [vscode.CodeActionKind.QuickFix] }
    )
  )
}

// --- Terminal-based commands ---

function startInTerminal() {
  const terminal = vscode.window.createTerminal('openPly')
  terminal.sendText('npx openply')
  terminal.show()
}

async function openChat() {
  const prompt = await vscode.window.showInputBox({
    prompt: 'What do you want openPly to do?',
    placeHolder: 'Add authentication, fix the bug, refactor...',
  })

  if (prompt) {
    const terminal = vscode.window.createTerminal('openPly')
    terminal.sendText(`openply "${prompt.replace(/"/g, '\\"')}"`)
    terminal.show()
  }
}

function explainSelected() {
  const editor = vscode.window.activeTextEditor
  if (!editor) return

  const text = editor.document.getText(editor.selection)
  if (!text) {
    vscode.window.showInformationMessage('Select some code to explain')
    return
  }

  const terminal = vscode.window.createTerminal('openPly')
  terminal.sendText(`openply "Explain this code in detail, covering what it does, why it exists, and any potential issues:\n\n$(cat <<'OPENPLY_EOF'\n${text}\nOPENPLY_EOF\n)"`)
  terminal.show()
}

function refactorSelected() {
  const editor = vscode.window.activeTextEditor
  if (!editor) return

  const text = editor.document.getText(editor.selection)
  if (!text) {
    vscode.window.showInformationMessage('Select some code to refactor')
    return
  }

  vscode.window.showInputBox({
    prompt: 'How should this code be refactored?',
    placeHolder: 'Extract to function, simplify, add error handling...',
  }).then(instruction => {
    if (!instruction) return
    const terminal = vscode.window.createTerminal('openPly')
    terminal.sendText(`openply "Refactor this code: ${instruction}\n\n$(cat <<'OPENPLY_EOF'\n${text}\nOPENPLY_EOF\n)"`)
    terminal.show()
  })
}

function addTestsForFile() {
  const editor = vscode.window.activeTextEditor
  if (!editor) return

  const filePath = editor.document.fileName
  const terminal = vscode.window.createTerminal('openPly')
  terminal.sendText(`openply "@tester Write comprehensive tests for ${filePath}"`)
  terminal.show()
}

function fixDiagnostics() {
  const editor = vscode.window.activeTextEditor
  if (!editor) return

  const diagnostics = vscode.languages.getDiagnostics(editor.document.uri)
  if (diagnostics.length === 0) {
    vscode.window.showInformationMessage('No diagnostics found')
    return
  }

  const diagText = diagnostics.map(d => {
    const range = d.range
    return `Line ${range.start.line + 1}: [${vscode.DiagnosticSeverity[d.severity]}] ${d.message}`
  }).join('\n')

  const terminal = vscode.window.createTerminal('openPly')
  terminal.sendText(`openply "@debugger Fix these issues in ${editor.document.fileName}:\n${diagText.replace(/"/g, '\\"')}"`)
  terminal.show()
}

function toggleMode() {
  currentMode = currentMode === 'plan' ? 'build' : 'plan'
  updateStatusBar()
  vscode.window.showInformationMessage(`openPly mode: ${currentMode}`)
}

async function selectModel() {
  const models = [
    { label: 'DeepSeek V4 Pro', id: 'deepseek/deepseek-v4-pro' },
    { label: 'DeepSeek V4 Flash', id: 'deepseek/deepseek-v4-flash' },
    { label: 'MiMo 2.5 Pro', id: 'minimax/minimax-m2-pro' },
    { label: 'Kimi K2.7 Code', id: 'kimi/kimi-k2.7-code' },
    { label: 'MiniMax M3', id: 'minimax/minimax-m3' },
    { label: 'Claude Sonnet 4', id: 'anthropic/claude-sonnet-4-20250514' },
    { label: 'GPT-4o', id: 'openai/gpt-4o' },
  ]

  const selected = await vscode.window.showQuickPick(models, {
    placeHolder: 'Select a model',
  })

  if (selected) {
    currentModel = selected.id
    updateStatusBar()
    vscode.window.showInformationMessage(`openPly model: ${selected.label}`)
  }
}

// --- Webview Panel ---

function openWebviewPanel() {
  const panel = vscode.window.createWebviewPanel(
    'openply',
    'openPly Chat',
    vscode.ViewColumn.Beside,
    {
      enableScripts: true,
      retainContextWhenHidden: true,
    }
  )

  panel.webview.html = getWebviewHtml()

  panel.webview.onDidReceiveMessage(async (message) => {
    if (message.type === 'chat') {
      try {
        const { stdout } = await execAsync(
          `openply --json "${message.prompt.replace(/"/g, '\\"')}"`,
          { cwd: vscode.workspace.workspaceFolders?.[0]?.uri.fsPath || process.cwd() }
        )
        panel.webview.postMessage({ type: 'response', content: stdout })
      } catch (err: any) {
        panel.webview.postMessage({ type: 'error', content: err.message })
      }
    }
  })
}

function getWebviewHtml(): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: var(--vscode-font-family); background: var(--vscode-editor-background); color: var(--vscode-editor-foreground); height: 100vh; display: flex; flex-direction: column; }
    #messages { flex: 1; overflow-y: auto; padding: 16px; }
    .msg { margin-bottom: 12px; padding: 8px 12px; border-radius: 6px; max-width: 80%; }
    .msg.user { background: var(--vscode-button-background); color: var(--vscode-button-foreground); align-self: flex-end; margin-left: auto; }
    .msg.assistant { background: var(--vscode-editorWidget-background); border: 1px solid var(--vscode-editorWidget-border); }
    #input-bar { display: flex; gap: 8px; padding: 12px 16px; border-top: 1px solid var(--vscode-editorWidget-border); }
    #input { flex: 1; background: var(--vscode-input-background); border: 1px solid var(--vscode-input-border); color: var(--vscode-input-foreground); padding: 8px 12px; border-radius: 4px; font-family: inherit; resize: none; }
    #send { background: var(--vscode-button-background); color: var(--vscode-button-foreground); border: none; padding: 8px 16px; border-radius: 4px; cursor: pointer; }
    #send:hover { background: var(--vscode-button-hoverBackground); }
    pre { white-space: pre-wrap; font-family: var(--vscode-editor-font-family); font-size: 13px; }
  </style>
</head>
<body>
  <div id="messages">
    <div class="msg assistant"><pre>openPly ready. Ask me anything about your code.</pre></div>
  </div>
  <div id="input-bar">
    <textarea id="input" rows="1" placeholder="Ask openPly..."></textarea>
    <button id="send">Send</button>
  </div>
  <script>
    const vscode = acquireVsCodeApi();
    const messages = document.getElementById('messages');
    const input = document.getElementById('input');
    const sendBtn = document.getElementById('send');

    function addMsg(role, content) {
      const div = document.createElement('div');
      div.className = 'msg ' + role;
      div.innerHTML = '<pre>' + content.replace(/</g, '&lt;') + '</pre>';
      messages.appendChild(div);
      messages.scrollTop = messages.scrollHeight;
    }

    function send() {
      const text = input.value.trim();
      if (!text) return;
      addMsg('user', text);
      input.value = '';
      vscode.postMessage({ type: 'chat', prompt: text });
    }

    sendBtn.addEventListener('click', send);
    input.addEventListener('keydown', e => {
      if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send(); }
    });

    window.addEventListener('message', event => {
      const msg = event.data;
      if (msg.type === 'response') {
        try {
          const parsed = JSON.parse(msg.content);
          addMsg('assistant', parsed.edits ? 'Done. ' + parsed.edits + ' files modified.' : msg.content);
        } catch { addMsg('assistant', msg.content); }
      } else if (msg.type === 'error') {
        addMsg('assistant', 'Error: ' + msg.content);
      }
    });
  </script>
</body>
</html>`
}

// --- Code Actions Provider ---

class OpenPLYCodeActionProvider implements vscode.CodeActionProvider {
  provideCodeActions(
    document: vscode.TextDocument,
    range: vscode.Range | vscode.Selection,
    context: vscode.CodeActionContext,
    token: vscode.CancellationToken
  ): vscode.CodeAction[] {
    const actions: vscode.CodeAction[] = []
    const selectedText = document.getText(range)

    if (selectedText) {
      // Explain action
      const explainAction = new vscode.CodeAction('openPly: Explain this code', vscode.CodeActionKind.QuickFix)
      explainAction.command = {
        command: 'openply.explain',
        title: 'Explain with openPly',
      }
      actions.push(explainAction)

      // Refactor action
      const refactorAction = new vscode.CodeAction('openPly: Refactor this code', vscode.CodeActionKind.QuickFix)
      refactorAction.command = {
        command: 'openply.refactor',
        title: 'Refactor with openPly',
      }
      actions.push(refactorAction)
    }

    // Fix diagnostics action
    if (context.diagnostics.length > 0) {
      const fixAction = new vscode.CodeAction('openPly: Fix all issues', vscode.CodeActionKind.QuickFix)
      fixAction.command = {
        command: 'openply.fixDiagnostics',
        title: 'Fix with openPly',
      }
      actions.push(fixAction)
    }

    return actions
  }
}

// --- Status Bar ---

function updateStatusBar() {
  const modeIcon = currentMode === 'plan' ? '$(book)' : '$(tools)'
  statusBarItem.text = `$(zap) openPly: ${modeIcon} ${currentMode} | ${currentModel.split('/').pop()}`
  statusBarItem.tooltip = `openPly v0.2.0\nMode: ${currentMode}\nModel: ${currentModel}\nClick to toggle mode`
  statusBarItem.command = 'openply.toggleMode'
}

export function deactivate() {}
