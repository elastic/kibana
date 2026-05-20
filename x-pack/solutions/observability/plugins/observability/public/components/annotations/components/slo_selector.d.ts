import React from 'react';
export interface SloItem {
    id: string;
    instanceId?: string;
    name?: string;
    groupBy?: string;
}
interface Props {
    value?: SloItem;
    onSelected: (vals: {
        slo?: {
            id: string;
            instanceId?: string;
        };
        all?: boolean;
    }) => void;
    hasError?: boolean;
}
export declare function SloSelector({ value, onSelected, hasError }: Props): React.JSX.Element;
export declare const SLO_SELECTOR: string;
export declare const SLO_LABEL: string;
export {};
