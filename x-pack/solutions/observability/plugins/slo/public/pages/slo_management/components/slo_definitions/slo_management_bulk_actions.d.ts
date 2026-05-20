import type { SLODefinitionResponse } from '@kbn/slo-schema';
import React from 'react';
interface Props {
    items: SLODefinitionResponse[];
    setSelectedItems: (items: SLODefinitionResponse[]) => void;
}
export declare function SloManagementBulkActions({ items, setSelectedItems }: Props): React.JSX.Element;
export {};
