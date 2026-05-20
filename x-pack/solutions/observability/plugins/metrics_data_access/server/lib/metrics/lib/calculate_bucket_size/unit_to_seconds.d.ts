export declare const ASCENDING_UNIT_ORDER: string[];
export declare const parseInterval: (intervalString: string) => {
    value: number | undefined;
    unit: string | undefined;
};
export declare const convertIntervalToUnit: (intervalString: string, newUnit: string) => {
    value: number | undefined;
    unit: string | undefined;
};
export declare const getSuitableUnit: (intervalInSeconds: number) => string | undefined;
export declare const getUnitValue: (unit: string) => number;
