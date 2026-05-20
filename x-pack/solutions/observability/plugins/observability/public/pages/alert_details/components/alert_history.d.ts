import React from 'react';
import type { Rule } from '@kbn/triggers-actions-ui-plugin/public';
import type { TopAlert } from '../../..';
interface Props {
    alert: TopAlert;
    rule: Rule;
}
export declare function AlertHistoryChart({ rule, alert }: Props): React.JSX.Element;
export {};
