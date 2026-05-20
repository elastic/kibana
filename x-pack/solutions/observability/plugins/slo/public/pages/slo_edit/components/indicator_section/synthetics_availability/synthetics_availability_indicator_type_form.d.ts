import type { FiltersSchema } from '@kbn/slo-schema';
import React from 'react';
export declare function SyntheticsAvailabilityIndicatorTypeForm(): React.JSX.Element;
export declare const getGroupByCardinalityFilters: (monitorIds: string[], projects: string[], tags: string[]) => FiltersSchema;
