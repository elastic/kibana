import React from 'react';
import type { AlertStatus } from '@kbn/rule-data-utils';
import type { TopAlert } from '../../../typings/alerts';
import { type AlertDetailsRuleFormFlyoutBaseProps } from './alert_details_rule_form_flyout';
export interface HeaderActionsProps extends AlertDetailsRuleFormFlyoutBaseProps {
    alert: TopAlert | null;
    alertIndex?: string;
    alertStatus?: AlertStatus;
    onUntrackAlert: () => void;
}
export declare function HeaderActions({ alert, alertIndex, alertStatus, onUntrackAlert, onUpdate, rule, refetch, }: HeaderActionsProps): React.JSX.Element;
