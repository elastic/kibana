export interface TimePickerQuickRange {
    from: string;
    to: string;
    display: string;
}
export declare function useQuickTimeRanges(): {
    start: string;
    end: string;
    label: string;
}[];
