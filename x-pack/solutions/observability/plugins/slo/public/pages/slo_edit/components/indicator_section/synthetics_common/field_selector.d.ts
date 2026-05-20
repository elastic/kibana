import type { ReactNode } from 'react';
import React from 'react';
import type { SyntheticsAvailabilityIndicator } from '@kbn/slo-schema';
import type { FieldPath } from 'react-hook-form';
import type { Suggestion } from '../../../../../hooks/use_fetch_synthetics_suggestions';
import type { CreateSLOForm } from '../../../types';
export interface Props {
    allowAllOption?: boolean;
    dataTestSubj: string;
    fieldName: 'monitorIds' | 'projects' | 'tags' | 'locations';
    label: string;
    name: FieldPath<CreateSLOForm<SyntheticsAvailabilityIndicator>>;
    placeholder: string;
    tooltip?: ReactNode;
    suggestions?: Suggestion[];
    isLoading?: boolean;
    required?: boolean;
    filters: Record<string, string[]>;
}
export declare function FieldSelector({ allowAllOption, dataTestSubj, fieldName, label, name, placeholder, tooltip, required, filters, }: Props): React.JSX.Element;
