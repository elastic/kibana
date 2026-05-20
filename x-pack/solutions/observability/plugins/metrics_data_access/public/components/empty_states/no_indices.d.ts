import React from 'react';
import type { EuiEmptyPromptProps } from '@elastic/eui';
interface NoIndicesProps extends Omit<EuiEmptyPromptProps, 'body' | 'title'> {
    body: string;
    title: string;
}
export declare const NoIndices: React.FC<NoIndicesProps>;
export {};
