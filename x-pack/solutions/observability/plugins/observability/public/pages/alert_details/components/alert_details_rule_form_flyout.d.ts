import React from 'react';
import type { RuleFormStepId } from '@kbn/response-ops-rule-form/src/constants';
import type { Rule } from '@kbn/triggers-actions-ui-plugin/public';
export interface AlertDetailsRuleFormFlyoutBaseProps {
    onUpdate?: () => void;
    refetch: () => void;
    rule?: Rule;
}
interface Props extends AlertDetailsRuleFormFlyoutBaseProps {
    initialEditStep?: RuleFormStepId;
    isRuleFormFlyoutOpen: boolean;
    setIsRuleFormFlyoutOpen: React.Dispatch<boolean>;
    rule: Rule;
}
export declare function AlertDetailsRuleFormFlyout({ initialEditStep, onUpdate, refetch, isRuleFormFlyoutOpen, setIsRuleFormFlyoutOpen, rule, }: Props): React.JSX.Element | null;
export {};
