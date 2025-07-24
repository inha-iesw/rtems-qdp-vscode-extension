import * as vscode from 'vscode';
import { QDPWebviewProvider } from './webview/webviewProvider';
import { BuildExecutor } from './build/buildExecutor';
import { ConfigManager } from './config/configManager';

export function activate(context: vscode.ExtensionContext) {
    console.log('RTEMS QDP Builder extension is now active!');

    const configManager = new ConfigManager(context);
    const buildExecutor = new BuildExecutor();
    const webviewProvider = new QDPWebviewProvider(context, configManager, buildExecutor);

    // Webview Provider 등록
    const provider = vscode.window.registerWebviewViewProvider(
        'rtems-qdp-config',
        webviewProvider
    );

    // 명령어 등록
    const openConfigPanel = vscode.commands.registerCommand('rtems-qdp-builder.openConfigPanel', () => {
        webviewProvider.show();
    });

    const buildCommand = vscode.commands.registerCommand('rtems-qdp-builder.build', async () => {
        try {
            const config = await configManager.getCurrentConfig();
            await buildExecutor.executeBuild(config);
            vscode.window.showInformationMessage('QDP 빌드가 완료되었습니다.');
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : String(error);
            console.error('빌드 실패:', error);
            vscode.window.showErrorMessage(`빌드 실패: ${errorMessage}`);
        }
    });

    const generateConfigCommand = vscode.commands.registerCommand('rtems-qdp-builder.generateConfig', async () => {
        try {
            await configManager.generateConfigFile();
            vscode.window.showInformationMessage('설정 파일이 생성되었습니다.');
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : String(error);
            console.error('설정 파일 생성 실패:', error);
            vscode.window.showErrorMessage(`설정 파일 생성 실패: ${errorMessage}`);
        }
    });

    const savePresetCommand = vscode.commands.registerCommand('rtems-qdp-builder.savePreset', async () => {
        try {
            const presetName = await vscode.window.showInputBox({
                prompt: '프리셋 이름을 입력하세요',
                placeHolder: '예: my-custom-build',
                validateInput: (value) => {
                    if (!value || value.trim().length === 0) {
                        return '프리셋 이름을 입력해주세요.';
                    }
                    if (!/^[a-zA-Z0-9가-힣_-]+$/.test(value.trim())) {
                        return '프리셋 이름에는 문자, 숫자, 언더스코어, 하이픈만 사용할 수 있습니다.';
                    }
                    return null;
                }
            });

            if (presetName) {
                const config = await configManager.getCurrentConfig();
                const presetData = {
                    name: presetName.trim(),
                    description: `사용자 정의 프리셋: ${presetName.trim()}`,
                    steps: config.selectedSteps || []
                };
                
                await configManager.savePreset(presetName.trim(), presetData);
                vscode.window.showInformationMessage(`프리셋 "${presetName}"이 저장되었습니다.`);
            }
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : String(error);
            console.error('프리셋 저장 실패:', error);
            vscode.window.showErrorMessage(`프리셋 저장 실패: ${errorMessage}`);
        }
    });

    context.subscriptions.push(provider, openConfigPanel, buildCommand, generateConfigCommand, savePresetCommand);
}

export function deactivate() {}