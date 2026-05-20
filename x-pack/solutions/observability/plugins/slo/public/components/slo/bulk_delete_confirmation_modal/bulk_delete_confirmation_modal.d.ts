import type { SLODefinitionResponse } from '@kbn/slo-schema';
import React from 'react';
export interface Props {
    onCancel: () => void;
    onConfirm: () => void;
    items: SLODefinitionResponse[];
}
export declare function BulkDeleteConfirmationModal({ items, onCancel, onConfirm }: Props): React.JSX.Element;
