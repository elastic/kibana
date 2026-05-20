import React from 'react';
import type { AlertStatus } from '@kbn/rule-data-utils';
import type { TopAlert } from '../../../typings/alerts';
export interface StatusBarProps {
    alert: TopAlert | null;
    alertStatus?: AlertStatus;
}
export declare function StatusBar({ alert, alertStatus }: StatusBarProps): React.JSX.Element | null;
