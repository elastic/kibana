import React from 'react';
export interface NormalizationOptions {
    baselineScale: number;
    baselineTime: number;
    comparisonScale: number;
    comparisonTime: number;
}
export declare enum ComparisonMode {
    Absolute = "absolute",
    Relative = "relative"
}
export declare enum NormalizationMode {
    Scale = "scale",
    Time = "time"
}
interface Props {
    mode: NormalizationMode;
    options: NormalizationOptions;
    onChange: (mode: NormalizationMode, options: NormalizationOptions) => void;
}
export declare function NormalizationMenu(props: Props): React.JSX.Element;
export {};
