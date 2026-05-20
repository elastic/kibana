import React from 'react';
import type { BuilderItem } from '../types';
interface Props {
    item: BuilderItem;
    isExpanded: boolean;
    toggleExpanded: () => void;
}
export declare function Series({ item, isExpanded, toggleExpanded }: Props): React.JSX.Element;
export declare const ACCORDION_LABEL: string;
export {};
