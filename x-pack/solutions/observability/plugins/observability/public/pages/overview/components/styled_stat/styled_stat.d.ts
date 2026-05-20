import React from 'react';
import type { EuiStatProps } from '@elastic/eui/src/components/stat/stat';
interface Props extends Partial<EuiStatProps> {
    children?: React.ReactNode;
    color?: string;
}
export declare function StyledStat(props: Props): React.JSX.Element;
export {};
