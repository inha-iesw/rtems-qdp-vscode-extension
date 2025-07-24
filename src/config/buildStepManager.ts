import * as vscode from 'vscode';
import * as yaml from 'js-yaml';
import * as path from 'path';
import { FileUtils } from '../utils/fileUtils';

export interface BuildStepInfo {
    uid: string;
    name: string;
    description: string;
    category: string;
    is_default?: boolean;
    tags?: string[];
    estimated_time?: string;
    dependencies?: string[];
    config_file?: string;
    config_fields?: string[];
}

export interface CategoryInfo {
    id: string;
    name: string;
    description: string;
    icon?: string;
    config_path?: string;
}

export interface BuildStepMetadata {
    buildSteps: { [key: string]: BuildStepInfo };
    categories: { [key: string]: CategoryInfo };
    defaultBuildSteps: string[];
}

export class BuildStepManager {
    private context: vscode.ExtensionContext;
    private metadata: BuildStepMetadata | null = null;

    constructor(context: vscode.ExtensionContext) {
        this.context = context;
    }

    async getBuildStepMetadata(): Promise<BuildStepMetadata> {
        if (!this.metadata) {
            await this.loadMetadata();
        }
        return this.metadata!;
    }

    private async loadMetadata(): Promise<void> {
        try {
            const metadataPath = path.join(this.context.extensionPath, 'config', 'package-build.yml');
            const metadataContent = await FileUtils.readFile(metadataPath);
            const rawMetadata = yaml.load(metadataContent) as any;

            this.metadata = {
                buildSteps: this.parseBuildSteps(rawMetadata['build-steps']),
                categories: this.parseCategories(rawMetadata.categories || []),
                defaultBuildSteps: rawMetadata.default_build_steps || []
            };
        } catch (error) {
            console.error('메타데이터 로드 실패:', error);
            this.metadata = {
                buildSteps: {},
                categories: {},
                defaultBuildSteps: []
            };
        }
    }

    private parseBuildSteps(rawBuildSteps: any[]): { [key: string]: BuildStepInfo } {
        const buildSteps: { [key: string]: BuildStepInfo } = {};
        
        if (!Array.isArray(rawBuildSteps)) {
            return buildSteps;
        }

        for (const stepData of rawBuildSteps) {
            if (stepData.uid) {
                buildSteps[stepData.uid] = {
                    uid: stepData.uid,
                    name: stepData.name || stepData.uid,
                    description: stepData.description || stepData.uid,
                    category: stepData.category || 'other',
                    is_default: stepData.is_default || false,
                    tags: stepData.tags || [],
                    estimated_time: stepData.estimated_time,
                    dependencies: stepData.dependencies || [],
                    config_file: stepData.config_file,
                    config_fields: stepData.config_fields || []
                };
            }
        }

        return buildSteps;
    }

    private parseCategories(rawCategories: any[]): { [key: string]: CategoryInfo } {
        const categories: { [key: string]: CategoryInfo } = {};
        
        if (!Array.isArray(rawCategories)) {
            return categories;
        }

        for (const categoryData of rawCategories) {
            if (categoryData.id) {
                categories[categoryData.id] = {
                    id: categoryData.id,
                    name: categoryData.name || categoryData.id,
                    description: categoryData.description || '',
                    icon: categoryData.icon,
                    config_path: categoryData.config_path
                };
            }
        }

        return categories;
    }

    async getBuildStepsByCategory(): Promise<{ [category: string]: BuildStepInfo[] }> {
        const metadata = await this.getBuildStepMetadata();
        const result: { [category: string]: BuildStepInfo[] } = {};

        for (const step of Object.values(metadata.buildSteps)) {
            if (!result[step.category]) {
                result[step.category] = [];
            }
            result[step.category].push(step);
        }

        // 각 카테고리별로 정렬
        for (const category in result) {
            result[category].sort((a, b) => a.name.localeCompare(b.name));
        }

        return result;
    }

    async getDefaultBuildSteps(): Promise<string[]> {
        const metadata = await this.getBuildStepMetadata();
        
        // 명시적으로 정의된 기본 빌드 스텝이 있으면 사용
        if (metadata.defaultBuildSteps && metadata.defaultBuildSteps.length > 0) {
            return metadata.defaultBuildSteps;
        }
        
        // 없으면 is_default가 true인 스텝들을 찾아서 반환
        return Object.values(metadata.buildSteps)
            .filter(step => step.is_default)
            .map(step => step.uid);
    }

    async validateBuildSteps(steps: string[]): Promise<{ valid: string[], invalid: string[] }> {
        const metadata = await this.getBuildStepMetadata();
        const valid: string[] = [];
        const invalid: string[] = [];

        for (const step of steps) {
            if (metadata.buildSteps[step]) {
                valid.push(step);
            } else {
                invalid.push(step);
            }
        }

        return { valid, invalid };
    }

    async getBuildStepInfo(stepId: string): Promise<BuildStepInfo | null> {
        const metadata = await this.getBuildStepMetadata();
        return metadata.buildSteps[stepId] || null;
    }
}