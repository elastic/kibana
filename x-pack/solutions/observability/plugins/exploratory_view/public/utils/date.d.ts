import datemath from '@kbn/datemath';
export declare function getAbsoluteTime(range: string, opts?: Parameters<typeof datemath.parse>[1]): number | undefined;
export declare function getAbsoluteDateRange({ rangeFrom, rangeTo, }: {
    rangeFrom?: string;
    rangeTo?: string;
}): {
    start: undefined;
    end: undefined;
} | {
    start: string;
    end: string;
};
