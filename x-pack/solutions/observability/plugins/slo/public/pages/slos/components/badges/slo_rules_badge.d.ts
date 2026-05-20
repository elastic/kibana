import React from 'react';
import type { Rule } from '@kbn/triggers-actions-ui-plugin/public';
import type { BurnRateRuleParams } from '../../../../typings';
export interface Props {
    rules: Array<Rule<BurnRateRuleParams>> | undefined;
    isRemote?: boolean;
    onClick?: () => void;
}
export declare function SloRulesBadge({ rules, onClick, isRemote }: Props): React.JSX.Element | null;
