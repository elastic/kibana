import React from 'react';
export interface LegendItem {
    color: string;
    label: string;
}
export declare function Legend({ legendItems }: {
    legendItems: LegendItem[];
}): React.JSX.Element;
