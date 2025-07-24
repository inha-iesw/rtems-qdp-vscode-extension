import * as vscode from 'vscode';
import * as yaml from 'js-yaml';
import * as path from 'path';
import { FileUtils } from '../utils/fileUtils';
import { YamlGenerator } from './yamlGenerator';
import { BuildStepManager } from './buildStepManager';

export interface QDPConfig {
    targetArchitecture: string;
    targetBSP: string;
    isSMP: boolean;
    buildDirectory: string;
    selectedSteps: string[];
    deploymentDirectory: string;
    configVariant: string;
    platform: {
        description: string;
        name: string;
    };
}

export class ConfigManager {
    private context: vscode.ExtensionContext;
    private yamlGenerator: YamlGenerator;
    private buildStepManager: BuildStepManager;
    private currentConfig: QDPConfig;

    constructor(context: vscode.ExtensionContext) {
        this.context = context;
        this.yamlGenerator = new YamlGenerator();
        this.buildStepManager = new BuildStepManager(context);
        this.currentConfig = this.getDefaultConfig();
        
        // 초기화 시 실제 RTEMS 디렉터리 찾기
        this.initializeConfig();
    }

    private async initializeConfig(): Promise<void> {
        try {
            const deploymentDir = await this.getRtemsDeploymentDirectory();
            this.currentConfig.deploymentDirectory = deploymentDir;
        } catch (error) {
            console.warn('RTEMS 디렉터리 초기화 실패:', error);
        }
    }

    private async getRtemsDeploymentDirectory(): Promise<string> {
        try {
            const workspaceFolder = vscode.workspace.workspaceFolders?.[0];
            if (!workspaceFolder) {
                return '/opt/rtems-6-sparc-gr740-smp-5'; // 기본값
            }

            const optPath = workspaceFolder.uri.fsPath;
            const fs = require('fs').promises;
            const entries = await fs.readdir(optPath);
            const smp = this.currentConfig.isSMP ? 'smp' : 'uni';
            const targetArchitecture = this.currentConfig.targetArchitecture;
            const targetBSP = this.currentConfig.targetBSP;
            const targetRtemsDir = `rtems-6-${targetArchitecture}-${targetBSP}-${smp}-5`
            const rtemsDir = entries.find((entry: string) => entry.startsWith(targetRtemsDir));
            
            if (rtemsDir) {
                return path.join(optPath, rtemsDir);
            }
        } catch (error) {
            console.warn('RTEMS 디렉터리 찾기 실패, 기본값 사용:', error);
        }
        
        return '/opt/rtems-6-sparc-gr740-smp-5'; // 기본값
    }

    private getDefaultConfig(): QDPConfig {
        return {
            targetArchitecture: 'sparc',
            targetBSP: 'gr740',
            isSMP: true,
            buildDirectory: 'build-sparc-gr740-smp-user-qual',
            selectedSteps: [
                'steps/build-bsp',
                'steps/build-bsp-qual-only',
                'steps/build-bsp-qual-only-coverage',
                'steps/run-local-target-qual-only',
                'steps/run-local-target-qual-only-coverage',
                'steps/build-ddf-sdd',
                'steps/build-djf-svr'
            ],
            deploymentDirectory: '/opt/rtems-6-sparc-gr740-smp-5', // 기본값, 실제로는 동적으로 설정됨
            configVariant: 'sparc-gr740-smp',
            platform: {
                description: 'User Hardware Execution',
                name: 'board'
            }
        };
    }

    async getCurrentConfig(): Promise<QDPConfig> {
        // 현재 워크스페이스에서 실제 RTEMS 디렉터리 찾기
        try {
            const deploymentDir = await this.getRtemsDeploymentDirectory();
            this.currentConfig.deploymentDirectory = deploymentDir;
        } catch (error) {
            console.warn('RTEMS 디렉터리 업데이트 실패:', error);
        }
        
        return this.currentConfig;
    }

    async updateConfig(config: Partial<QDPConfig>): Promise<void> {
        // 사용자가 수정할 수 있는 필드만 업데이트
        const allowedFields: (keyof QDPConfig)[] = [
            'targetArchitecture',
            'targetBSP',
            'isSMP',
            'buildDirectory',
            'selectedSteps',
            'platform'];
        
        const filteredConfig: Partial<QDPConfig> = {};
        for (const key of allowedFields) {
            if (key in config) {
                (filteredConfig as any)[key] = config[key];
            }
        }
        
        this.currentConfig = { ...this.currentConfig, ...filteredConfig };
        await this.saveConfigToWorkspace(); // 실패해도 메모리의 설정은 유지됨
    }

    async loadPreset(presetName: string): Promise<void> {
        try {
            const presetPath = path.join(this.context.extensionPath, 'presets', `${presetName}.yml`);
            const presetContent = await FileUtils.readFile(presetPath);
            const preset = yaml.load(presetContent) as any;
            
            if (preset.steps) {
                this.currentConfig.selectedSteps = preset.steps;
                await this.saveConfigToWorkspace(); // 실패해도 괜찮음 (에러 처리됨)
            } else {
                throw new Error('프리셋 파일에 steps 필드가 없습니다.');
            }
        } catch (error) {
            if (error instanceof Error) {
                throw new Error(`프리셋 로드 실패: ${error.message}`);
            } else {
                throw new Error(`프리셋 로드 실패: ${error}`);
            }
        }
    }

    async savePreset(presetName: string, presetData: any): Promise<void> {
        try {
            const presetPath = path.join(this.context.extensionPath, 'presets', `${presetName}.yml`);
            const presetContent = yaml.dump(presetData, {
                indent: 2,
                lineWidth: -1,
                noRefs: true
            });
            
            await FileUtils.writeFile(presetPath, presetContent);
        } catch (error) {
            throw new Error(`프리셋 저장 실패: ${error instanceof Error ? error.message : error}`);
        }
    }

    async deletePreset(presetName: string): Promise<void> {
        try {
            // 기본 프리셋은 삭제 불가
            if (['default', 'minimal', 'full'].includes(presetName)) {
                throw new Error('기본 프리셋은 삭제할 수 없습니다.');
            }

            const presetPath = path.join(this.context.extensionPath, 'presets', `${presetName}.yml`);
            
            // 파일 존재 확인
            if (!await FileUtils.fileExists(presetPath)) {
                throw new Error('프리셋 파일을 찾을 수 없습니다.');
            }

            await FileUtils.deleteFile(presetPath);
        } catch (error) {
            throw new Error(`프리셋 삭제 실패: ${error instanceof Error ? error.message : error}`);
        }
    }

    async getAvailablePresets(): Promise<string[]> {
        try {
            const presetsDir = path.join(this.context.extensionPath, 'presets');
            const files = await FileUtils.readDirectory(presetsDir);
            return files
                .filter(file => file.endsWith('.yml'))
                .map(file => path.basename(file, '.yml'))
                .sort((a, b) => {
                    // 기본 프리셋을 먼저 정렬
                    const builtins = ['default', 'minimal', 'full'];
                    const aBuiltin = builtins.includes(a);
                    const bBuiltin = builtins.includes(b);
                    
                    if (aBuiltin && !bBuiltin) return -1;
                    if (!aBuiltin && bBuiltin) return 1;
                    if (aBuiltin && bBuiltin) {
                        return builtins.indexOf(a) - builtins.indexOf(b);
                    }
                    return a.localeCompare(b);
                });
        } catch (error) {
            console.error('프리셋 목록 로드 실패:', error);
            return ['default', 'minimal', 'full']; // 기본 프리셋만 반환
        }
    }

    async generateConfigFile(): Promise<string> {
        try {
            const workspaceFolder = vscode.workspace.workspaceFolders?.[0];
            if (!workspaceFolder) {
                throw new Error('워크스페이스 폴더가 없습니다.');
            }

            const optPath = workspaceFolder.uri.fsPath; // /opt
            
            // RTEMS 설치 디렉터리 찾기
            const fs = require('fs').promises;
            const entries = await fs.readdir(optPath);
            const smp = this.currentConfig.isSMP ? 'smp' : 'uni';
            const targetArchitecture = this.currentConfig.targetArchitecture;
            const targetBSP = this.currentConfig.targetBSP;
            const targetRtemsDir = `rtems-6-${targetArchitecture}-${targetBSP}-${smp}-5`
            const rtemsDir = entries.find((entry: string) => entry.startsWith(targetRtemsDir));
            
            if (!rtemsDir) {
                throw new Error('RTEMS 설치 디렉터리를 찾을 수 없습니다.');
            }

            // qual-tool 디렉터리에 YAML 파일 생성
            const qualToolPath = path.join(optPath, rtemsDir, 'qual-tool', 'config-variants');
            const yamlContent = await this.yamlGenerator.generateYaml(this.currentConfig);
            const configFileName = `${this.currentConfig.buildDirectory || "default-config"}.yml`;
            const configPath = path.join(qualToolPath, configFileName);
            
            await FileUtils.writeFile(configPath, yamlContent);
            
            vscode.window.showInformationMessage(`설정 파일이 생성되었습니다: ${configPath}`);
            return configPath;
        } catch (error) {
            throw new Error(`설정 파일 생성 실패: ${error}`);
        }
    }

    async getBuildStepMetadata() {
        return await this.buildStepManager.getBuildStepMetadata();
    }

    private async saveConfigToWorkspace(): Promise<void> {
        try {
            const config = vscode.workspace.getConfiguration('rtems-qdp-builder');
            await config.update('currentConfig', this.currentConfig, vscode.ConfigurationTarget.Workspace);
        } catch (error) {
            console.warn('Workspace 설정 저장 실패, 메모리에만 유지됩니다:', error);
            // Workspace 설정 저장에 실패해도 메모리의 currentConfig는 유지됨
        }
    }

    async loadConfigFromWorkspace(): Promise<void> {
        try {
            const config = vscode.workspace.getConfiguration('rtems-qdp-builder');
            const savedConfig = config.get('currentConfig') as QDPConfig;
            
            if (savedConfig && Object.keys(savedConfig).length > 0) {
                this.currentConfig = { ...this.getDefaultConfig(), ...savedConfig };
            }
        } catch (error) {
            console.warn('Workspace 설정 로드 실패, 기본 설정을 사용합니다:', error);
            this.currentConfig = this.getDefaultConfig();
        }
    }
}