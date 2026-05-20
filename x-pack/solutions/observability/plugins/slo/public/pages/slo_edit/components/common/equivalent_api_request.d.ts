import type { GetSLOResponse } from '@kbn/slo-schema';
import React from 'react';
interface Props {
    isEditMode: boolean;
    disabled: boolean;
    slo?: GetSLOResponse;
}
export declare function EquivalentApiRequest({ disabled, isEditMode, slo }: Props): React.JSX.Element;
export {};
