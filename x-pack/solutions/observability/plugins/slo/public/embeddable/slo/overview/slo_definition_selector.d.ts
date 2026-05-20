import React from 'react';
import type { SearchSLODefinitionItem } from '@kbn/slo-schema';
interface Props {
    onSelected: (slo: SearchSLODefinitionItem | undefined) => void;
    hasError?: boolean;
    remoteName?: string;
}
export declare function SloDefinitionSelector({ onSelected, hasError, remoteName }: Props): React.JSX.Element;
export {};
