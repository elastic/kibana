export declare function getParsedDate(rawDate?: string, options?: {}): Date | undefined;
export declare function getNextTimeRange({ state, rangeFrom, rangeTo, }: {
    state?: {
        rangeFrom?: string;
        rangeTo?: string;
        start?: string;
        end?: string;
    };
    rangeFrom?: string;
    rangeTo?: string;
}): {
    start: string | undefined;
    end: string | undefined;
};
