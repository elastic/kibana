import React from 'react';
import type { Rule } from '@kbn/triggers-actions-ui-plugin/public';
import type { TopAlert } from '../../../typings/alerts';
declare function StaleAlert({ alert, alertStatus, rule, refetchRule, onUntrackAlert, }: {
    alert: TopAlert;
    alertStatus: string | undefined;
    rule: Rule | undefined;
    refetchRule: () => void;
    onUntrackAlert: () => void;
}): React.JSX.Element;
export default StaleAlert;
