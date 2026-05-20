import React from 'react';
interface Props {
    initialBurnRate?: number;
    errors?: string[];
    onChange: (burnRate: number) => void;
    longLookbackWindowInHours: number;
    sloTimeWindowInHours: number;
}
export declare function BudgetConsumed({ onChange, initialBurnRate, longLookbackWindowInHours, sloTimeWindowInHours, errors, }: Props): React.JSX.Element;
export {};
