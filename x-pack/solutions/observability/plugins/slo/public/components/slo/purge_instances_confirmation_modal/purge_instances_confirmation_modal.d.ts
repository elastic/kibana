import type { SLODefinitionResponse } from '@kbn/slo-schema';
import React from 'react';
interface Props {
    items?: SLODefinitionResponse[];
    onCancel: () => void;
    onConfirm: () => void;
}
export declare function PurgeInstancesConfirmationModal({ items, onCancel, onConfirm }: Props): React.JSX.Element;
export {};
