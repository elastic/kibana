import React from 'react';
interface Props {
    initialBurnRate?: number;
    maxBurnRate: number;
    errors?: string[];
    onChange: (burnRate: number) => void;
}
export declare function BurnRate({ onChange, initialBurnRate, maxBurnRate, errors }: Props): React.JSX.Element;
export {};
