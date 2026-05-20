import React from 'react';
import type { TimeRange } from '@kbn/es-query';
import type { SloEmbeddableDeps } from '../types';
import type { SloItem } from '../types';
interface Props {
    deps: SloEmbeddableDeps;
    slos: SloItem[];
    timeRange: TimeRange;
    onLoaded?: () => void;
}
export declare function SloAlertsSummary({ slos, deps, timeRange, onLoaded }: Props): React.JSX.Element;
export {};
