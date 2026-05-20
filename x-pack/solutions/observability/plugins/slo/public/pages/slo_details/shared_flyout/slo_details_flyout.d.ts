import type { EuiFlyoutProps } from '@elastic/eui';
import type { SloTabId } from '@kbn/deeplinks-observability';
import React from 'react';
export interface SLODetailsFlyoutProps {
    sloId: string;
    sloInstanceId?: string;
    onClose: () => void;
    size?: EuiFlyoutProps['size'];
    hideFooter?: boolean;
    session?: 'start' | 'inherit';
    initialTabId?: SloTabId;
}
export default function SLODetailsFlyout({ sloId, sloInstanceId, onClose, size, hideFooter, session, initialTabId, }: SLODetailsFlyoutProps): React.JSX.Element;
