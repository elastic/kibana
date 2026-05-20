import React from 'react';
import type { EuiIconProps, EuiTextProps } from '@elastic/eui';
type CPUType = 'self' | 'total';
interface Props {
    type: CPUType;
    labelSize?: EuiTextProps['size'];
    labelStyle?: EuiTextProps['style'];
    iconSize?: EuiIconProps['size'];
}
export declare function CPULabelWithHint({ iconSize, labelSize, labelStyle, type }: Props): React.JSX.Element;
export {};
