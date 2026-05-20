import type { GetSLOResponse } from '@kbn/slo-schema';
import React from 'react';
import type { CreateSLOForm, FormSettings } from '../types';
export interface Props {
    initialValues?: CreateSLOForm;
    slo?: GetSLOResponse;
    onFlyoutClose?: () => void;
    formSettings?: FormSettings;
}
export declare function SloEditForm({ slo, initialValues, onFlyoutClose, formSettings, }: Props): React.JSX.Element;
