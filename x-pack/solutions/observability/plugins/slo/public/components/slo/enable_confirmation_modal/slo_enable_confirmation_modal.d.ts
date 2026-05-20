import type { SLODefinitionResponse, SLOWithSummaryResponse } from '@kbn/slo-schema';
import React from 'react';
export interface Props {
    slo: SLOWithSummaryResponse | SLODefinitionResponse;
    onCancel: () => void;
    onConfirm: () => void;
}
export declare function SloEnableConfirmationModal({ slo, onCancel, onConfirm }: Props): React.JSX.Element;
