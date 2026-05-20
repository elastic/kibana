import React from 'react';
import type { TimeBounds } from '../../types';
interface Props {
    period: 'week' | 'month';
    range: TimeBounds;
    onChange: (range: TimeBounds) => void;
    onReset?: () => void;
    isResetDisabled?: boolean;
}
export declare function CalendarPeriodPicker({ period, range, onChange, onReset, isResetDisabled, }: Props): React.JSX.Element;
export {};
