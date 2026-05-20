import type { EuiFlexGroupProps } from '@elastic/eui';
import React from 'react';
import type { AsyncState } from '../hooks/use_async';
export declare function AsyncComponent({ children, status, error, size, style, alignTop, }: AsyncState<any> & {
    style?: EuiFlexGroupProps['style'];
    children: React.ReactElement;
    size: 'm' | 'l' | 'xl';
    alignTop?: boolean;
}): React.JSX.Element;
