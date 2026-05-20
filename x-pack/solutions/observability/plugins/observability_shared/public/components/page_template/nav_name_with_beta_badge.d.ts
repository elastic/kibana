import React from 'react';
import type { IconType } from '@elastic/eui';
interface Props {
    label?: string;
    isTechnicalPreview?: boolean;
    iconType?: IconType;
}
export declare function NavNameWithBetaBadge({ label, iconType, isTechnicalPreview }: Props): React.JSX.Element;
export {};
