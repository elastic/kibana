import type { SLOWithSummaryResponse } from '@kbn/slo-schema';
import React from 'react';
interface Props {
    slo: SLOWithSummaryResponse;
    onClick?: (tag: string) => void;
    defaultVisibleTags?: number;
}
export declare function SloTagsBadge({ slo, onClick, defaultVisibleTags }: Props): React.JSX.Element | null;
export {};
