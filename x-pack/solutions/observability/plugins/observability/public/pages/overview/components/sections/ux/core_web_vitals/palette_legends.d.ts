import React from 'react';
import type { Thresholds } from './core_vital_item';
interface Props {
    onItemHover: (ind: number | null) => void;
    ranks: number[];
    thresholds: Thresholds;
    title: string;
    isCls?: boolean;
}
export declare function PaletteLegends({ ranks, title, onItemHover, thresholds, isCls }: Props): React.JSX.Element;
export {};
