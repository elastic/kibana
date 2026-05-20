import React from 'react';
import type { EuiIconProps, EuiTextProps } from '@elastic/eui';
interface Props {
    label: string;
    hint: string;
    labelSize?: EuiTextProps['size'];
    labelStyle?: EuiTextProps['style'];
    iconSize?: EuiIconProps['size'];
}
export declare function LabelWithHint({ label, hint, iconSize, labelSize, labelStyle }: Props): React.JSX.Element;
export {};
