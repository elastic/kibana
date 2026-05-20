import type { SLODefinitionResponse, SLOWithSummaryResponse } from '@kbn/slo-schema';
import React from 'react';
export interface Props {
    slo: SLOWithSummaryResponse | SLODefinitionResponse;
    onCancel: () => void;
    onConfirm: () => void;
}
export declare function SloDisableConfirmationModal({ slo, onCancel, onConfirm }: Props): React.JSX.Element;
