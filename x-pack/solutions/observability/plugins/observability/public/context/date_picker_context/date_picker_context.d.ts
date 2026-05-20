import React from 'react';
export interface DatePickerContextValue {
    relativeStart: string;
    relativeEnd: string;
    absoluteStart?: number;
    absoluteEnd?: number;
    refreshInterval: number;
    refreshPaused: boolean;
    updateTimeRange: (params: {
        start: string;
        end: string;
    }) => void;
    updateRefreshInterval: (params: {
        interval: number;
        isPaused: boolean;
    }) => void;
    lastUpdated: number;
}
/**
 * This context contains the time range (both relative and absolute) and the
 * autorefresh status of the overview page date picker.
 * It also updates the URL when any of the values change
 */
export declare const DatePickerContext: React.Context<DatePickerContextValue>;
export declare function DatePickerContextProvider({ children }: {
    children: React.ReactElement;
}): React.JSX.Element;
