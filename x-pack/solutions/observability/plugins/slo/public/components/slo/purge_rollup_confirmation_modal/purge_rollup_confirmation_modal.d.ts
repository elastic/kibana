import type { BulkPurgePolicyInput } from '@kbn/slo-schema';
import React from 'react';
interface Props {
    onCancel: () => void;
    onConfirm: (purgePolicy: BulkPurgePolicyInput, force: boolean) => void;
    purgePolicyHelpText: string;
}
export declare function PurgeRollupConfirmationModal({ purgePolicyHelpText, onCancel, onConfirm }: Props): React.JSX.Element;
export {};
