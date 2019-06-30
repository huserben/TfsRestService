export interface IGeneralFunctions {
    sleep(ms: number): Promise<void>;
    trimValues(values: string[]): string[];
    trimValue(value: string): string;
}
export declare class GeneralFunctions implements IGeneralFunctions {
    sleep(ms: number): Promise<void>;
    trimValues(values: string[]): string[];
    trimValue(value: string): string;
}
