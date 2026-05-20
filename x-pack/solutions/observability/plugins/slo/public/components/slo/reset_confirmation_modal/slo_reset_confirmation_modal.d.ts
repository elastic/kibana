import type { SLODefinitionResponse, SLOWithSummaryResponse } from '@kbn/slo-schema';
import React from 'react';
export interface SloResetConfirmationModalProps {
    slo: SLOWithSummaryResponse | SLODefinitionResponse;
    onCancel: () => void;
    onConfirm: () => void;
}
export declare function SloResetConfirmationModal({ slo, onCancel, onConfirm, }: SloResetConfirmationModalProps): React.JSX.Element;
