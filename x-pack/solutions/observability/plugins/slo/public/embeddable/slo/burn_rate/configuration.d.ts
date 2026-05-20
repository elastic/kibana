import React from 'react';
import type { BurnRateCustomState } from './types';
interface Props {
    onCreate: (state: BurnRateCustomState) => void;
    onCancel: () => void;
}
export declare function Configuration({ onCreate, onCancel }: Props): React.JSX.Element;
export {};
