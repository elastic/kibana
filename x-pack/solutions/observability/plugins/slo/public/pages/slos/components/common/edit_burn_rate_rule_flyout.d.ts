import React from 'react';
import type { Rule } from '@kbn/triggers-actions-ui-plugin/public';
import type { BurnRateRuleParams } from '../../../../typings';
export declare function EditBurnRateRuleFlyout({ refetchRules, rule, isEditRuleFlyoutOpen, setIsEditRuleFlyoutOpen, }: {
    rule?: Rule<BurnRateRuleParams>;
    isEditRuleFlyoutOpen: boolean;
    setIsEditRuleFlyoutOpen: (value: boolean) => void;
    refetchRules: () => void;
}): React.JSX.Element | null;
