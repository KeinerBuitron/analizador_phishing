const vscode = require('vscode');
const path = require('path');
const fs = require('fs');

function activate(context) {
    let disposable = vscode.commands.registerCommand('analizadorPhishing.start', function () {

        // 1. Configuración de rutas estáticas para la carpeta 'media' en la raíz
        const mediaPath = vscode.Uri.joinPath(context.extensionUri, 'media');
        const indexPath = path.join(context.extensionPath, 'index.html');

        // Panel del webView
        const panel = vscode.window.createWebviewPanel(
            'analizadorPhishing',
            'Analizador de Phishing',
            vscode.ViewColumn.One,
            { 
                enableScripts: true,
                localResourceRoots: [mediaPath] // Concede permisos a la subcarpeta media
            }
        );

        // 2. Cargar el index.html existente e inyectar las URIs de VS Code
        let htmlContent = fs.readFileSync(indexPath, 'utf8');
        
        const styleUri = panel.webview.asWebviewUri(vscode.Uri.joinPath(mediaPath, 'style.css'));
        const scriptUri = panel.webview.asWebviewUri(vscode.Uri.joinPath(mediaPath, 'main.js'));

        // Reemplazamos las rutas relativas del HTML por las URIs seguras de VS Code
        htmlContent = htmlContent.replace(/["'](media\/)?style\.css["']/g, `"${styleUri}"`);
        htmlContent = htmlContent.replace(/["'](media\/)?main\.js["']/g, `"${scriptUri}"`);

        panel.webview.html = htmlContent;

        // ESCUCHAR MENSAJES DESDE MAIN.JS DENTRO DEL WEBVIEW
        panel.webview.onDidReceiveMessage(
            async message => {
                switch (message.command) {
                    
                    // 1. ANALIZAR CORREO
                    case 'analizarCorreo':
                        try {
                            const response = await fetch('http://127.0.0.1:8000/prediccion', {
                                method: 'POST',
                                headers: { 'Content-Type': 'application/json' },
                                body: JSON.stringify({ texto: message.texto })
                            });
                            const data = await response.json();
                            
                            // Devolver el resultado al main.js
                            panel.webview.postMessage({ command: 'resultadoAnalisis', data: data });
                        } catch (error) {
                            panel.webview.postMessage({ command: 'error', message: 'Error conectando con FastAPI' });
                        }
                        return;

                    // 2. ENVIAR FEEDBACK
                    case 'enviarFeedback':
                        try {
                            const response = await fetch('http://127.0.0.1:8000/feedback', {
                                method: 'POST',
                                headers: { 'Content-Type': 'application/json' },
                                body: JSON.stringify({ tipo_feedback: message.tipo_feedback })
                            });
                            const data = await response.json();
                            panel.webview.postMessage({ command: 'resultadoFeedback', data: data });
                        } catch (error) {
                            panel.webview.postMessage({ command: 'error', message: 'Error enviando feedback' });
                        }
                        return;

                    // 3. DISPARAR RE-ENTRENAMIENTO
                    case 'reentrenar':
                        try {
                            const response = await fetch('http://127.0.0.1:8000/reentrenar', {
                                method: 'POST'
                            });
                            const data = await response.json();
                            panel.webview.postMessage({ command: 'resultadoReentrenamiento', data: data });
                        } catch (error) {
                            panel.webview.postMessage({ command: 'error', message: 'Error al re-entrenar' });
                        }
                        return;
                }
            },
            undefined,
            context.subscriptions
        );
    });

    context.subscriptions.push(disposable);
}

exports.activate = activate;