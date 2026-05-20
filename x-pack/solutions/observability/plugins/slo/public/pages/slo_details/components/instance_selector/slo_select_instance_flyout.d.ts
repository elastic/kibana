import { type SLOWithSummaryResponse } from '@kbn/slo-schema';
import React from 'react';
export declare function SloSelectInstanceFlyout({ slo, onClose, onSelect, }: {
    slo: SLOWithSummaryResponse;
    onClose: () => void;
    onSelect: (instanceId: string) => void;
}): React.JSX.Element;
