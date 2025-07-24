import * as fs from 'fs';
import * as path from 'path';

export class FileUtils {
    static getParentDirectory(directory: string): string {
        try {
            const parts = directory.split(path.sep);
        if (parts.length < 2) {
            return directory; // 디렉터리가 하나만 있는 경우 그대로 반환
        }
        return parts.slice(0, -1).join(path.sep); // 마지막 부분을 제외한 나머지 경로 반환
        } catch (error) {
            throw new Error(`부모 디렉터리 가져오기 실패: ${directory} - ${error}`);
        }
    }

    static async readFile(filePath: string): Promise<string> {
        try {
            return await fs.promises.readFile(filePath, 'utf8');
        } catch (error) {
            throw new Error(`파일 읽기 실패: ${filePath} - ${error}`);
        }
    }

    static async writeFile(filePath: string, content: string): Promise<void> {
        try {
            // 디렉터리가 없으면 생성
            const dir = path.dirname(filePath);
            await this.ensureDirectory(dir);
            
            await fs.promises.writeFile(filePath, content, 'utf8');
        } catch (error) {
            throw new Error(`파일 쓰기 실패: ${filePath} - ${error}`);
        }
    }

    static async readDirectory(dirPath: string): Promise<string[]> {
        try {
            return await fs.promises.readdir(dirPath);
        } catch (error) {
            throw new Error(`디렉터리 읽기 실패: ${dirPath} - ${error}`);
        }
    }

    static async ensureDirectory(dirPath: string): Promise<void> {
        try {
            await fs.promises.mkdir(dirPath, { recursive: true });
        } catch (error) {
            throw new Error(`디렉터리 생성 실패: ${dirPath} - ${error}`);
        }
    }

    static async fileExists(filePath: string): Promise<boolean> {
        try {
            await fs.promises.access(filePath);
            return true;
        } catch {
            return false;
        }
    }

    static async copyFile(source: string, destination: string): Promise<void> {
        try {
            const dir = path.dirname(destination);
            await this.ensureDirectory(dir);
            await fs.promises.copyFile(source, destination);
        } catch (error) {
            throw new Error(`파일 복사 실패: ${source} -> ${destination} - ${error}`);
        }
    }

    static async deleteFile(filePath: string): Promise<void> {
        try {
            await fs.promises.unlink(filePath);
        } catch (error) {
            throw new Error(`파일 삭제 실패: ${filePath} - ${error}`);
        }
    }

    static async getFileStats(filePath: string): Promise<fs.Stats> {
        try {
            return await fs.promises.stat(filePath);
        } catch (error) {
            throw new Error(`파일 정보 가져오기 실패: ${filePath} - ${error}`);
        }
    }

    static getRelativePath(from: string, to: string): string {
        return path.relative(from, to);
    }

    static joinPath(...paths: string[]): string {
        return path.join(...paths);
    }

    static getExtension(filePath: string): string {
        return path.extname(filePath);
    }

    static getBasename(filePath: string, ext?: string): string {
        return path.basename(filePath, ext);
    }

    static getDirname(filePath: string): string {
        return path.dirname(filePath);
    }

}