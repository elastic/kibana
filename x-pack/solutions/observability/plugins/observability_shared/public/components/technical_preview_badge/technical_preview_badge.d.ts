import type { IconType } from '@elastic/eui';
import { EuiBetaBadge } from '@elastic/eui';
import React from 'react';
type Props = {
    icon?: IconType;
} & Pick<React.ComponentProps<typeof EuiBetaBadge>, 'size' | 'style'>;
export declare function TechnicalPreviewBadge({ icon, size, style }: Props): React.JSX.Element;
export {};
