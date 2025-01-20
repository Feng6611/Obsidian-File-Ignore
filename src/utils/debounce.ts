/**
 * 创建一个防抖函数
 * @param func 要防抖的函数
 * @param wait 等待时间（毫秒）
 */
export function debounce<T extends (...args: any[]) => any>(
    func: T,
    wait: number
): (...args: Parameters<T>) => ReturnType<T> {
    let timeout: NodeJS.Timeout;

    return function (this: any, ...args: Parameters<T>): ReturnType<T> {
        clearTimeout(timeout);

        return new Promise((resolve) => {
            timeout = setTimeout(() => {
                resolve(func.apply(this, args));
            }, wait);
        }) as ReturnType<T>;
    };
} 