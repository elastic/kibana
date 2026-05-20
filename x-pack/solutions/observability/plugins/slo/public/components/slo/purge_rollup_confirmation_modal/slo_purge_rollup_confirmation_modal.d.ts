import type { SLODefinitionResponse } from '@kbn/slo-schema';
import React from 'react';
interface Props {
    onCancel: () => void;
    onConfirm: () => void;
    item: SLODefinitionResponse;
}
export declare function SloPurgeRollupConfirmationModal({ item, onCancel, onConfirm }: Props): React.JSX.Element;
export {};
