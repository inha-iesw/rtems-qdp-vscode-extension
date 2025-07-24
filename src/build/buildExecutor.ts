import * as vscode from 'vscode';
import * as path from 'path';
import { spawn } from 'child_process';
import { QDPConfig } from '../config/configManager';
import iconv from 'iconv-lite';

export class BuildExecutor {
    private outputChannel: vscode.OutputChannel;

    constructor() {
        this.outputChannel = vscode.window.createOutputChannel('RTEMS QDP Builder');
    }

    async executeBuild(config: QDPConfig): Promise<void> {
        const workspaceFolder = vscode.workspace.workspaceFolders?.[0];
        if (!workspaceFolder) {
            throw new Error('워크스페이스 폴더가 없습니다.');
        }

        const optPath = workspaceFolder.uri.fsPath; // /opt
        
        // RTEMS 설치 디렉터리 찾기
        const fs = require('fs').promises;
        const entries = await fs.readdir(optPath);
        const rtemsDir = entries.find((entry: string) => entry.startsWith('rtems-6-sparc-'));
        
        if (!rtemsDir) {
            throw new Error('RTEMS 설치 디렉터리를 찾을 수 없습니다.');
        }

        const qualToolPath = path.join(optPath, rtemsDir, 'qual-tool'); // /opt/rtems-6-sparc-gr740-smp-5/qual-tool
        const configFileName = `${config.buildDirectory || "default-config"}.yml`;
        const configPath = path.join(qualToolPath, 'config-variants', configFileName);

        this.outputChannel.clear();
        this.outputChannel.show();

        try {
            // 0단계: 파이썬 환경 확인
            const isPythonAvailable = await this.checkPythonEnvironment(qualToolPath);
            if (!isPythonAvailable) {
                // 0-1단계: 파이썬 설치 (make env)
                await this.installPythonEnvironment(qualToolPath);
                this.outputChannel.appendLine('🔧 파이썬 환경이 설치되었습니다.');
            }
            // 1단계: 설정 실행
            await this.executeConfigCommand(qualToolPath, configPath);

            // 2단계: 빌드 실행
            await this.executeBuildCommand(qualToolPath, config.buildDirectory);

            this.outputChannel.appendLine('\n✅ 빌드가 성공적으로 완료되었습니다!');
        } catch (error) {
            this.outputChannel.appendLine(`\n❌ 빌드 실패: ${error}`);
            throw error;
        }
    }
    private async checkPythonEnvironment(qualToolPath: string): Promise<boolean> {
        const fs = require('fs').promises;
        const activatePath = path.join(qualToolPath, 'env', 'bin', 'activate');
        const isWindows = process.platform === 'win32';

        // Windows의 경우, activate 스크립트 경로 조정
        const adjustedActivatePath = isWindows
            ? activatePath.replace(/\//g, '\\')
            : activatePath;

        try {
            // activate 스크립트가 존재하는지 확인
            await fs.access(adjustedActivatePath);
            return true;
        } catch {
            return false;
        }
    }

    private async installPythonEnvironment(qualToolPath: string): Promise<void> {
        const fs = require('fs').promises;
        const makefilePath = path.join(qualToolPath, 'Makefile');

        // Makefile 존재 확인
        try {
            await fs.access(makefilePath);
        } catch {
            throw new Error('Makefile이 qual-tool 디렉터리에 없습니다.');
        }

        this.outputChannel.appendLine('🔧 Python 환경을 설치 중... (make env)');

        return new Promise((resolve, reject) => {
            const process = spawn('make', ['env'], {
                cwd: qualToolPath,
                shell: true,
            });

            process.stdout.on('data', (data) => {
                this.outputChannel.append(data.toString());
            });

            process.stderr.on('data', (data) => {
                this.outputChannel.append(data.toString());
            });

            process.on('close', (code) => {
                if (code === 0) {
                    resolve();
                } else {
                    reject(new Error(`make env 명령어가 실패했습니다 (exit code: ${code})`));
                }
            });

            process.on('error', (error) => {
                reject(new Error(`make env 실행 오류: ${error.message}`));
            });
        });
    }

    private async executeConfigCommand(qualToolPath: string, configPath: string): Promise<void> {
        const diffPath = path.relative(qualToolPath, configPath);
        const isWindows = process.platform === 'win32';

        this.outputChannel.appendLine('🔧 QDP 설정을 실행 중...');
        this.outputChannel.appendLine(`Command: ./qdp_config.py ${diffPath}`);
        this.outputChannel.appendLine('');
        
        const command = isWindows
            ? `"conda activate rtems; python qdp_config.py ${diffPath}; conda deactivate"`
            : `". env/bin/activate && ./qdp_config.py ${diffPath}"`;
            

        return new Promise((resolve, reject) => {
            const configProcess = spawn(isWindows ? 'powershell' : 'bash',
                                        isWindows ? ['-Command', command] : ['-c', command],
            {
                cwd: qualToolPath,
                shell: true,
            });

            configProcess.stdout.on('data', (data) => {
                const decoded = isWindows ? iconv.decode(data, 'cp949') : data.toString();
                this.outputChannel.append(decoded);
            });

            configProcess.stderr.on('data', (data) => {
                const decoded = isWindows ? iconv.decode(data, 'cp949') : data.toString();
                this.outputChannel.append(decoded);
            });

            configProcess.on('close', (code) => {
                if (code === 0) {
                    this.outputChannel.appendLine('\n✅ 설정 완료\n');
                    resolve();
                } else {
                    reject(new Error(`설정 명령어가 실패했습니다 (exit code: ${code})`));
                }
            });

            configProcess.on('error', (error) => {
                reject(new Error(`설정 명령어 실행 오류: ${error.message}`));
            });
        });
    }

    private async executeBuildCommand(qualToolPath: string, buildDirectory: string): Promise<void> {
        const isWindows = process.platform === 'win32';
        const command = isWindows
            ? `"conda activate rtems; python qdp_build.py --log-level=DEBUG ${buildDirectory} 2>&1 | Tee-Object -FilePath log.txt; conda deactivate"`
            : `". env/bin/activate && ./qdp_build.py --log-level=DEBUG ${buildDirectory} 2>&1 | tee log.txt"`;

        this.outputChannel.appendLine('🔨 QDP 빌드를 실행 중...');
        this.outputChannel.appendLine(`Command: ${command}`);
        this.outputChannel.appendLine('');

        return new Promise((resolve, reject) => {
            const buildProcess = spawn(isWindows ? 'powershell' : 'bash',
                                        isWindows ? ['-Command', command] : ['-c', command],
            {
                cwd: qualToolPath,
                shell: true,
            });

            buildProcess.stdout.on('data', (data) => {
                const decoded = isWindows ? iconv.decode(data, 'cp949') : data.toString();
                this.outputChannel.append(decoded);
            });

            buildProcess.stderr.on('data', (data) => {
                const decoded = isWindows ? iconv.decode(data, 'cp949') : data.toString();
                this.outputChannel.append(decoded);
            });

            buildProcess.on('close', (code) => {
                if (code === 0) {
                    this.outputChannel.appendLine('\n✅ 빌드 완료');
                    resolve();
                } else {
                    reject(new Error(`빌드 명령어가 실패했습니다 (exit code: ${code})`));
                }
            });

            buildProcess.on('error', (error) => {
                reject(new Error(`빌드 명령어 실행 오류: ${error.message}`));
            });
        });
    }

    async checkEnvironment(config: QDPConfig): Promise<{ isValid: boolean, issues: string[] }> {
        const workspaceFolder = vscode.workspace.workspaceFolders?.[0];
        if (!workspaceFolder) {
            return {
                isValid: false,
                issues: ['워크스페이스 폴더가 없습니다.']
            };
        }

        const issues: string[] = [];
        const optPath = workspaceFolder.uri.fsPath; // /opt

        // // /opt 디렉터리인지 확인
        // if (!optPath.endsWith('opt')) {
        //     issues.push('워크스페이스가 /opt 디렉터리에서 열려있지 않습니다.');
        // }

        // RTEMS 설치 디렉터리 찾기
        try {
            const fs = require('fs').promises;
            const entries = await fs.readdir(optPath);
            const smp = config.isSMP ? 'smp' : 'uni';
            
            const targetRtemsDir = `rtems-6-${config.targetArchitecture}-${config.targetBSP}-${smp}-5`
            const rtemsDir = entries.find((entry: string) => entry.startsWith(targetRtemsDir));
            
            if (!rtemsDir) {
                issues.push('RTEMS 설치 디렉터리를 찾을 수 없습니다 (rtems-6-sparc-* 형태).');
                return { isValid: false, issues };
            }

            const rtemsPath = path.join(optPath, rtemsDir);
            const qualToolPath = path.join(rtemsPath, 'qual-tool');

            // qual-tool 디렉터리 확인
            try {
                await fs.access(qualToolPath);
            } catch {
                issues.push(`qual-tool 디렉터리가 없습니다: ${qualToolPath}`);
            }

            // qdp_config.py 파일 존재 확인
            try {
                await fs.access(path.join(qualToolPath, 'qdp_config.py'));
            } catch {
                issues.push('qdp_config.py 파일이 없습니다.');
            }

            // qdp_build.py 파일 존재 확인
            try {
                await fs.access(path.join(qualToolPath, 'qdp_build.py'));
            } catch {
                issues.push('qdp_build.py 파일이 없습니다.');
            }

            // config 디렉터리 확인
            try {
                await fs.access(path.join(qualToolPath, 'config'));
            } catch {
                issues.push('config 디렉터리가 없습니다.');
            }

            // RTEMS 바이너리 확인
            try {
                await fs.access(path.join(rtemsPath, 'bin', 'rtems-test'));
            } catch {
                issues.push('RTEMS 바이너리 (rtems-test)가 없습니다.');
            }

            // RTEMS 구조 확인
            try {
                await fs.access(path.join(rtemsPath, 'bin'));
                await fs.access(path.join(rtemsPath, 'include'));
            } catch {
                issues.push('RTEMS 설치 구조가 올바르지 않습니다.');
            }

        } catch (error) {
            issues.push(`디렉터리 확인 중 오류 발생: ${error}`);
        }

        return {
            isValid: issues.length === 0,
            issues
        };
    }

    dispose(): void {
        this.outputChannel.dispose();
    }
}