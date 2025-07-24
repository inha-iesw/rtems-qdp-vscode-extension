import * as yaml from 'js-yaml';
import { QDPConfig } from './configManager';
import { FileUtils } from '../utils/fileUtils';

interface YamlPostProcessItem {
    uid: string;
    path: string;
    action: string;
    value: any;
}

interface BuildStepLink {
    role: string;
    uid: string;
}

export class YamlGenerator {
    
    async generateYaml(config: QDPConfig): Promise<string> {
        const yamlObject = {
            'build-directory': config.buildDirectory,
            'post-process-items': this.createPostProcessItems(config),
            'spec-paths': ['spec-spec', 'spec-glossary', 'config']
        };

        return yaml.dump(yamlObject, {
            indent: 2,
            lineWidth: -1,
            noRefs: true
        });
    }

    private createPostProcessItems(config: QDPConfig): YamlPostProcessItem[] {
        const items: YamlPostProcessItem[] = [];

        items.push(...this.createVariantItems(config));

        // 아키텍처 및 BSP 설정
        items.push(...this.craeteArchitectureBSPItem(config));

        // DJF SVR 로그 파일 설정
        items.push(this.createTestLogFilesItem(config));

        // 배포 디렉터리 설정
        items.push(this.createDjfSvrDeployItem(config));
        items.push(this.createDdfSddDeployItem(config));

        // 설정 파일 설정
        items.push(this.createDjfSvrConfigItem());

        // 테스트 명령어 설정
        items.push(this.createLocalTargetQualOnlyItem(config));
        items.push(this.createLocalTargetQualOnlyCoverageItem(config));

        // 패키지 빌드 링크 설정
        items.push(this.createPackageBuildLinksItem(config));

        return items;
    }
    private craeteArchitectureBSPItem(config: QDPConfig): YamlPostProcessItem[] {
        const items: YamlPostProcessItem[] = [
            {
                uid: '/variant',
                path: '/arch',
                action: 'set',
                value: config.targetArchitecture
            },
            {
                uid: '/variant',
                path: '/bsp',
                action: 'set',
                value: config.targetBSP
            }
        ];
        if (config.targetBSP === 'gr740') {
            items.push({
                uid: '/variant',
                path: '/params/sis-target',
                action: 'set',
                value: config.targetBSP
            });
            items.push({
                uid: '/variant',
                path: '/enabled[0]',
                action: 'set',
                value: 'sparc/gr740'
            });
            items.push({
                uid: '/variant',
                path: '/params/sis-cpus',
                action: 'set',
                value: '4'
            });
        }
        return items;
    }

    private createVariantItems(config: QDPConfig): YamlPostProcessItem[] {
        return [
            {
            uid: '/variant',
            path: '/prefix-directory',
            action: 'set',
            value: FileUtils.getParentDirectory(config.deploymentDirectory)
            },
        ]
    }

    

    private createTestLogFilesItem(config: QDPConfig): YamlPostProcessItem {
        return {
            uid: '/steps/build-djf-svr',
            path: '/test-log-files',
            action: 'set',
            value: [
                {
                    'platform-description': config.platform.description,
                    'platform-name': config.platform.name,
                    'standard-log': `\${../variant:/build-directory}/test-reports/log-run-rtems-qual-only-${config.platform.name}.yaml`,
                    'coverage-log': `\${../variant:/build-directory}/test-reports/log-run-rtems-qual-only-${config.platform.name}-cov.yaml`
                }
            ]
        };
    }

    private createDjfSvrDeployItem(config: QDPConfig): YamlPostProcessItem {
        return {
            uid: '/dirs/djf-svr-deploy/dir',
            path: '/directory',
            action: 'set',
            value: `\${/variant:/deployment-directory}/user_doc/djf/svr`
        };
    }

    private createDdfSddDeployItem(config: QDPConfig): YamlPostProcessItem {
        return {
            uid: '/dirs/ddf-sdd-deploy/dir',
            path: '/directory',
            action: 'set',
            value: `\${/variant:/deployment-directory}/user_doc/ddf/sdd`
        };
    }

    private createDjfSvrConfigItem(): YamlPostProcessItem {
        return {
            uid: '/steps/build-djf-svr',
            path: '/config-file',
            action: 'set',
            value: 'rtems/djf/svr/config_user.yml'
        };
    }

    private createLocalTargetQualOnlyItem(config: QDPConfig): YamlPostProcessItem {
        return {
            uid: '/steps/run-local-target-qual-only',
            path: '/commands',
            action: 'set',
            value: [
                [
                    `\${../variant:/deployment-directory}/bin/rtems-test`,
                    `--user-config=\${.:config-directory}/\${.:config-file}`,
                    `--rtems-bsp=\${.:config-variant}`,
                    '.',
                    '--log-mode=all',
                    '--jobs=1',
                    '--timeout=7200',
                    '--report-format=yaml',
                    `--report-path=\${.:executables-directory}/log-run-rtems-qual-only-${config.platform.name}`
                ]
            ]
        };
    }

    private createLocalTargetQualOnlyCoverageItem(config: QDPConfig): YamlPostProcessItem {
        return {
            uid: '/steps/run-local-target-qual-only-coverage',
            path: '/commands',
            action: 'set',
            value: [
                [
                    `\${../variant:/deployment-directory}/bin/rtems-test`,
                    `--user-config=\${.:config-directory}/\${.:config-file}`,
                    `--rtems-bsp=\${.:config-variant}`,
                    '.',
                    '--log-mode=all',
                    '--jobs=1',
                    '--timeout=7200',
                    '--report-format=yaml',
                    `--report-path=\${.:executables-directory}/log-run-rtems-qual-only-${config.platform.name}-cov`
                ]
            ]
        };
    }

    private createPackageBuildLinksItem(config: QDPConfig): YamlPostProcessItem {
        const links: BuildStepLink[] = config.selectedSteps.map(step => ({
            role: 'build-step',
            uid: step
        }));

        return {
            uid: '/package-build',
            path: '/links',
            action: 'set',
            value: links
        };
    }
}