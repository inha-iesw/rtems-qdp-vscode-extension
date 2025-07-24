import * as vscode from 'vscode';
import * as path from 'path';
import { ConfigManager, QDPConfig } from '../config/configManager';
import { BuildExecutor } from '../build/buildExecutor';

export class QDPWebviewProvider implements vscode.WebviewViewProvider {
    public static readonly viewType = 'rtems-qdp-config';
    private _view?: vscode.WebviewView;

    constructor(
        private readonly context: vscode.ExtensionContext,
        private readonly configManager: ConfigManager,
        private readonly buildExecutor: BuildExecutor
    ) {}

    public resolveWebviewView(
        webviewView: vscode.WebviewView,
        context: vscode.WebviewViewResolveContext,
        _token: vscode.CancellationToken,
    ) {
        this._view = webviewView;

        webviewView.webview.options = {
            enableScripts: true,
            localResourceRoots: [
                vscode.Uri.file(path.join(this.context.extensionPath, 'media'))
            ]
        };

        webviewView.webview.html = this.getHtmlForWebview(webviewView.webview);

        // 메시지 리스너 설정
        webviewView.webview.onDidReceiveMessage(
            message => this.handleMessage(message),
            undefined,
            this.context.subscriptions
        );

        // 초기 데이터 로드
        this.initializeWebview();
    }

    private async handleMessage(message: any) {
        switch (message.type) {
            case 'getConfig':
                this.sendConfig();
                break;
            case 'getBuildSteps':
                this.sendBuildSteps();
                break;
            case 'getPresets':
                this.sendPresets();
                break;
            case 'updateConfig':
                try {
                    await this.configManager.updateConfig(message.config);
                    this.sendConfig();
                } catch (error) {
                    console.warn('설정 업데이트 실패:', error);
                    this.sendMessage({ type: 'error', message: '설정 업데이트에 실패했습니다.' });
                }
                break;
            case 'loadPreset':
                try {
                    await this.configManager.loadPreset(message.presetName);
                    this.sendConfig();
                    this.sendMessage({ type: 'success', message: '프리셋이 로드되었습니다.' });
                } catch (error) {
                    console.error('프리셋 로드 실패:', error);
                    this.sendMessage({ type: 'error', message: `프리셋 로드 실패: ${error instanceof Error ? error.message : error}` });
                }
                break;
            case 'savePreset':
                try {
                    await this.configManager.savePreset(message.presetName, message.presetDescription || '');
                    this.sendMessage({ type: 'presetSaved', success: true });
                } catch (error) {
                    console.error('프리셋 저장 실패:', error);
                    this.sendMessage({ type: 'presetSaved', success: false, error: error instanceof Error ? error.message : String(error) });
                }
                break;
            case 'deletePreset':
                try {
                    await this.configManager.deletePreset(message.presetName);
                    this.sendMessage({ type: 'presetDeleted', success: true });
                } catch (error) {
                    console.error('프리셋 삭제 실패:', error);
                    this.sendMessage({ type: 'presetDeleted', success: false, error: error instanceof Error ? error.message : String(error) });
                }
                break;
            case 'generateConfig':
                try {
                    const config_path = await this.configManager.generateConfigFile();
                    this.sendMessage({ type: 'configGenerated', success: true, path: config_path });
                } catch (error) {
                    this.sendMessage({ type: 'configGenerated', success: false, error: String(error) });
                }
                break;
            case 'build':
                this.executeBuild();
                break;
            case 'checkEnvironment':
                this.checkEnvironment();
                break;
        }
    }

    private async initializeWebview() {
        try {
            await this.configManager.loadConfigFromWorkspace();
            this.sendConfig();
            this.sendBuildSteps();
            this.sendPresets();
        } catch (error) {
            console.error('웹뷰 초기화 실패:', error);
            // 기본 설정으로라도 초기화 시도
            this.sendConfig();
            this.sendBuildSteps();
            this.sendPresets();
        }
    }

    private async sendConfig() {
        const config = await this.configManager.getCurrentConfig();
        this.sendMessage({
            type: 'config',
            config
        });
    }

    private async sendBuildSteps() {
        const metadata = await this.configManager.getBuildStepMetadata();
        this.sendMessage({
            type: 'buildSteps',
            buildSteps: metadata.buildSteps,
            categories: metadata.categories
        });
    }

    private async sendPresets() {
        try {
            const presets = await this.configManager.getAvailablePresets();
            this.sendMessage({
                type: 'presets',
                presets
            });
        } catch (error) {
            console.error('프리셋 전송 실패:', error);
            // 오류 발생 시 빈 배열 전송
            this.sendMessage({
                type: 'presets',
                presets: []
            });
        }
    }

    private async executeBuild() {
        try {
            const config = await this.configManager.getCurrentConfig();
            await this.buildExecutor.executeBuild(config);
            this.sendMessage({ type: 'buildCompleted', success: true });
        } catch (error) {
            this.sendMessage({ type: 'buildCompleted', success: false, error: String(error) });
        }
    }

    private async checkEnvironment() {
        const config = await this.configManager.getCurrentConfig();
        const result = await this.buildExecutor.checkEnvironment(config);
        this.sendMessage({
            type: 'environmentCheck',
            isValid: result.isValid,
            issues: result.issues
        });
    }

    private sendMessage(message: any) {
        if (this._view) {
            this._view.webview.postMessage(message);
        }
    }

    public show() {
        if (this._view) {
            this._view.show(true);
        }
    }

    private getHtmlForWebview(webview: vscode.Webview): string {
        const scriptUri = webview.asWebviewUri(vscode.Uri.file(
            path.join(this.context.extensionPath, 'media', 'main.js')
        ));
        const styleUri = webview.asWebviewUri(vscode.Uri.file(
            path.join(this.context.extensionPath, 'media', 'main.css')
        ));

        return `<!DOCTYPE html>
<html lang="ko">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>RTEMS QDP Builder</title>
    <link href="${styleUri}" rel="stylesheet">
</head>
<body>
    <div id="app">
        <header>
            <h1>🚀 RTEMS QDP Builder</h1>
        </header>

        <main>
            <!-- 환경 체크 섹션 -->
            <section class="environment-check">
                <h2>🔍 환경 체크</h2>
                <div class="form-group">
                    <label for="targetArchitecture">타겟 아키텍처:</label>
                    <input type="text" id="targetArchitecture" placeholder="sparc">
                    <small class="field-help">빌드할 타겟 아키텍처를 입력하세요 (예: sparc, x86).</small>
                </div>
                <div class="form-group">
                    <label for="targetBSP">타겟 BSP:</label>
                    <input type="text" id="targetBSP" placeholder="gr740">
                    <small class="field-help">빌드할 타겟 BSP를 입력하세요 (예: gr740, gr712rc).</small>
                </div>
                <div class="form-group">
                    <label for="isSMP">SMP 모드:</label>
                    <input type="checkbox" id="isSMP" checked>
                    <small class="field-help">SMP 모드로 빌드할지 여부
                </div>
                <button id="checkEnvBtn" class="btn btn-secondary">
                    환경 확인
                </button>
                <div id="envStatus" class="status-message"></div>
            </section>

            <!-- 기본 설정 섹션 -->
            <section class="config-section">
                <h2>📋 기본 설정</h2>
                <div class="form-group">
                    <label for="buildDirectory">빌드 디렉터리:</label>
                    <input type="text" id="buildDirectory" placeholder="build-sparc-gr740-smp-user-qual">
                    <small class="field-help">생성될 빌드 디렉터리 이름을 지정합니다.</small>
                </div>
                <div class="form-group">
                    <label for="platformDescription">플랫폼 설명:</label>
                    <input type="text" id="platformDescription" placeholder="User Hardware Execution">
                    <small class="field-help">테스트 플랫폼에 대한 설명입니다.</small>
                </div>
                <div class="form-group">
                    <label for="platformName">플랫폼 이름:</label>
                    <input type="text" id="platformName" placeholder="board">
                    <small class="field-help">테스트 플랫폼의 이름입니다 (예: board, simulator).</small>
                </div>
            </section>

            <!-- 프리셋 섹션 -->
            <section class="preset-section">
                <h2>🎯 프리셋</h2>
                <div class="preset-controls">
                    <select id="presetSelect">
                        <option value="">프리셋 선택...</option>
                    </select>
                    <button id="loadPresetBtn" class="btn btn-secondary">프리셋 로드</button>
                    <button id="savePresetBtn" class="btn btn-primary">프리셋 저장</button>
                    <button id="deletePresetBtn" class="btn btn-danger">프리셋 삭제</button>
                </div>
                
                <!-- 프리셋 저장 모달 -->
                <div id="savePresetModal" class="modal" style="display: none;">
                    <div class="modal-content">
                        <h3>프리셋 저장</h3>
                        <div class="form-group">
                            <label for="presetName">프리셋 이름:</label>
                            <input type="text" id="presetName" placeholder="나만의 빌드 설정">
                        </div>
                        <div class="form-group">
                            <label for="presetDescription">설명 (선택사항):</label>
                            <input type="text" id="presetDescription" placeholder="이 프리셋에 대한 설명">
                        </div>
                        <div class="modal-actions">
                            <button id="confirmSavePreset" class="btn btn-success">저장</button>
                            <button id="cancelSavePreset" class="btn btn-secondary">취소</button>
                        </div>
                    </div>
                </div>

                <!-- 프리셋 삭제 확인 모달 -->
                <div id="deletePresetModal" class="modal" style="display: none;">
                    <div class="modal-content">
                        <h3>프리셋 삭제</h3>
                        <p id="deletePresetMessage">이 프리셋을 삭제하시겠습니까?</p>
                        <div class="modal-actions">
                            <button id="confirmDeletePreset" class="btn btn-danger">삭제</button>
                            <button id="cancelDeletePreset" class="btn btn-secondary">취소</button>
                        </div>
                    </div>
                </div>
            </section>

            <!-- 빌드 스텝 섹션 -->
            <section class="build-steps-section">
                <h2>🔧 빌드 스텝</h2>
                <div id="buildStepsContainer">
                    <!-- 빌드 스텝 체크박스들이 여기에 동적으로 생성됨 -->
                </div>
            </section>

            <!-- 액션 버튼들 -->
            <section class="actions">
                <button id="generateConfigBtn" class="btn btn-primary">
                    📄 설정 파일 생성
                </button>
                <button id="buildBtn" class="btn btn-success">
                    🔨 빌드 실행
                </button>
            </section>

            <!-- 상태 메시지 -->
            <div id="statusMessage" class="status-message"></div>
        </main>
    </div>

    <script src="${scriptUri}"></script>
</body>
</html>`;
    }
}