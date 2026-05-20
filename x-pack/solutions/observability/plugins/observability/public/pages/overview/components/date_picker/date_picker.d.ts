import React from 'react';
export interface TimePickerQuickRange {
    from: string;
    to: string;
    display: string;
}
export interface DatePickerProps {
    rangeFrom?: string;
    rangeTo?: string;
    refreshPaused?: boolean;
    refreshInterval?: number;
    width?: 'auto' | 'restricted' | 'full';
    onTimeRangeRefresh?: (range: {
        start: string;
        end: string;
    }) => void;
}
export declare function DatePicker({ rangeFrom, rangeTo, refreshPaused, refreshInterval, width, onTimeRangeRefresh, }: DatePickerProps): React.JSX.Element;
export default DatePicker;
