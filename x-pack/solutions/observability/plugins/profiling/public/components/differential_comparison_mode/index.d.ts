import React from 'react';
import { ComparisonMode } from '../normalization_menu';
interface Props {
    comparisonMode: ComparisonMode;
    onChange: (nextComparisonMode: ComparisonMode) => void;
}
export declare function DifferentialComparisonMode({ comparisonMode, onChange }: Props): React.JSX.Element;
export {};
