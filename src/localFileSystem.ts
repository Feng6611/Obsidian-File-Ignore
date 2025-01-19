import * as fs from 'fs';
import * as path from 'path';

export interface FileInfo {
    name: string;
    path: string;
    isDirectory: boolean;
    stats: fs.Stats;
}

export class LocalFileSystem {
    private basePath: string;

    constructor(basePath: string) {
        this.basePath = basePath;
    }

    /**
     * 获取目录内容列表
     * @param relativePath 相对于vault根目录的路径
     * @returns 文件和目录信息列表
     */
    listDirectory(relativePath: string = ''): FileInfo[] {
        const fullPath = path.join(this.basePath, relativePath);
        try {
            // 修改 readdirSync 选项，包含隐藏文件
            const items = fs.readdirSync(fullPath, { withFileTypes: true, recursive: false });
            return items.map(item => {
                const itemPath = path.join(relativePath, item.name);
                return {
                    name: item.name,
                    path: itemPath.replace(/\\/g, '/'),  // 统一使用正斜杠
                    isDirectory: item.isDirectory(),
                    stats: fs.statSync(path.join(fullPath, item.name))
                };
            });
        } catch (error) {
            console.error(`读取目录失败 ${fullPath}:`, error);
            return [];
        }
    }

    /**
     * 递归获取所有文件和文件夹，包括隐藏文件
     */
    getAllFiles(currentPath: string = ''): FileInfo[] {
        const items = this.listDirectory(currentPath);
        let result: FileInfo[] = [...items];

        // 递归处理子目录
        for (const item of items) {
            if (item.isDirectory) {
                const subItems = this.getAllFiles(item.path);
                result = result.concat(subItems);
            }
        }

        return result;
    }

    /**
     * 读取文件内容
     * @param relativePath 相对于vault根目录的路径
     * @returns 文件内容
     */
    readFile(relativePath: string): string {
        try {
            const fullPath = path.join(this.basePath, relativePath);
            return fs.readFileSync(fullPath, 'utf8');
        } catch (error) {
            console.error('读取文件失败:', error);
            throw error;
        }
    }

    /**
     * 判断路径是否为目录
     * @param relativePath 相对于vault根目录的路径
     * @returns 是否为目录
     */
    isDirectory(relativePath: string): boolean {
        try {
            const fullPath = path.join(this.basePath, relativePath);
            return fs.statSync(fullPath).isDirectory();
        } catch (error) {
            console.error('检查目录失败:', error);
            throw error;
        }
    }

    /**
     * 获取文件或目录的详细信息
     * @param relativePath 相对于vault根目录的路径
     * @returns 文件信息
     */
    getFileInfo(relativePath: string): FileInfo {
        try {
            const fullPath = path.join(this.basePath, relativePath);
            const stats = fs.statSync(fullPath);
            return {
                name: path.basename(relativePath),
                path: relativePath,
                isDirectory: stats.isDirectory(),
                stats: stats
            };
        } catch (error) {
            console.error('获取文件信息失败:', error);
            throw error;
        }
    }

    /**
     * 获取文件的完整路径
     * @param relativePath 相对于vault根目录的路径
     * @returns 完整的文件系统路径
     */
    getFullPath(relativePath: string): string {
        return path.join(this.basePath, relativePath);
    }
} 