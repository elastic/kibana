import React from 'react';
import type { InventoryItemType } from '../../../../../common/inventory_models/types';
type ExtractStrict<T, U extends T> = Extract<T, U>;
type NodeTypeForLink = ExtractStrict<InventoryItemType, 'host' | 'container' | 'pod'>;
interface MetricsNodeDetailsLinkProps {
    id: string;
    label: string;
    nodeType: NodeTypeForLink;
    timerange: {
        from: string;
        to: string;
    };
    isOtel?: boolean;
    /** Infrastructure/metrics index pattern from settings; used for Discover ES|QL when isOtel is true. */
    metricsIndices?: string;
}
export declare const MetricsNodeDetailsLink: ({ id, label, nodeType, timerange, isOtel, metricsIndices, }: MetricsNodeDetailsLinkProps) => React.JSX.Element;
export {};
