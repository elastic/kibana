import type { TimeRange } from '@kbn/es-query';
import type { SLOWithSummaryResponse } from '@kbn/slo-schema';
import React from 'react';
import type { SloEventType, TimeBounds } from '../../types';
import type { GetPreviewDataResponseResults } from './types';
export interface Props {
    data: GetPreviewDataResponseResults;
    slo: SLOWithSummaryResponse;
    onBrushed?: (timeBounds: TimeBounds) => void;
    onBarClick?: (timeRange: TimeRange, eventType: SloEventType) => void;
}
export declare function GoodBadEventsChart({ data, slo, onBrushed, onBarClick }: Props): React.JSX.Element;
