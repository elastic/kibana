import React from 'react';
import type { AlertData } from '../../hooks/use_fetch_alert_detail';
interface Props {
    alertDetail: AlertData;
    switchTabs: () => void;
}
export declare function ProximalAlertsCallout({ alertDetail, switchTabs }: Props): React.JSX.Element | null;
export {};
