import type { SLODefinitionResponse, SLOWithSummaryResponse } from '@kbn/slo-schema';
import React from 'react';
interface Props {
    slo: SLOWithSummaryResponse | SLODefinitionResponse;
    onCancel: () => void;
    onConfirm: () => void;
}
export declare function SloDeleteConfirmationModal({ slo, onCancel, onConfirm }: Props): React.JSX.Element;
export {};
