import React from 'react';
import type { SloItem } from './types';
interface Props {
    initialSlos?: SloItem[];
    onSelected: (slos: SloItem[] | undefined) => void;
    hasError?: boolean;
    singleSelection?: boolean;
}
export declare function SloSelector({ initialSlos, onSelected, hasError, singleSelection }: Props): React.JSX.Element;
export {};
