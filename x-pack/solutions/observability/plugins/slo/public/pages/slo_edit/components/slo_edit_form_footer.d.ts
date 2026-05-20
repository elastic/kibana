import type { GetSLOResponse } from '@kbn/slo-schema';
import React from 'react';
export interface Props {
    slo?: GetSLOResponse;
    onFlyoutClose?: () => void;
    isEditMode: boolean;
}
export declare function SloEditFormFooter({ slo, onFlyoutClose, isEditMode }: Props): React.JSX.Element;
