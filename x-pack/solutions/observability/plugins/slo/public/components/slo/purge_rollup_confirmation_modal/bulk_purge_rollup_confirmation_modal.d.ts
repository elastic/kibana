import type { SLODefinitionResponse } from '@kbn/slo-schema';
import React from 'react';
interface Props {
    onCancel: () => void;
    onConfirm: () => void;
    items: SLODefinitionResponse[];
}
export declare function BulkPurgeRollupConfirmationModal({ items, onCancel, onConfirm }: Props): React.JSX.Element;
export {};
