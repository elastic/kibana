import React from 'react';
import type { TimeRange } from '@kbn/es-query';
import type { Subject } from 'rxjs';
import type { FetchContext } from '@kbn/presentation-publishing';
import type { SloItem, SloEmbeddableDeps } from './types';
interface Props {
    deps: SloEmbeddableDeps;
    slos: SloItem[];
    timeRange: TimeRange;
    onRenderComplete?: () => void;
    reloadSubject: Subject<FetchContext>;
    onEdit: () => void;
}
export declare function SloAlertsWrapper({ slos, deps, timeRange: initialTimeRange, onRenderComplete, reloadSubject, onEdit, }: Props): React.JSX.Element;
export {};
