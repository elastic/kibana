import type { AsCodeFilter } from '@kbn/as-code-filters-schema';
import type { Filter } from '@kbn/es-query';
import React from 'react';
import type { GroupFilters } from '../../../../../common/embeddables/overview/types';
interface Props {
    onSelected: (prop: string, value: string | Array<string | undefined> | Filter[] | AsCodeFilter[]) => void;
    selectedFilters: GroupFilters;
}
export declare function SloGroupFilters({ selectedFilters, onSelected }: Props): React.JSX.Element;
export {};
