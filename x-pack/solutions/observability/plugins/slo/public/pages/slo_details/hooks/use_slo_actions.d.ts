import type { SLOWithSummaryResponse } from '@kbn/slo-schema';
import type { Rule } from '@kbn/triggers-actions-ui-plugin/public';
import type { BurnRateRuleParams } from '../../../typings';
interface Props {
    slo?: SLOWithSummaryResponse;
    rules?: Array<Rule<BurnRateRuleParams>>;
    setIsEditRuleFlyoutOpen: (val: boolean) => void;
    setIsActionsPopoverOpen: (val: boolean) => void;
}
export declare const useSloActions: ({ slo, rules, setIsEditRuleFlyoutOpen, setIsActionsPopoverOpen, }: Props) => {
    sloEditUrl: string;
    handleNavigateToRules: () => void;
    remoteDeleteUrl: undefined;
    remoteResetUrl: undefined;
    remoteEnableUrl: undefined;
    remoteDisableUrl: undefined;
    sloDetailsUrl: string;
} | {
    sloEditUrl: string | undefined;
    handleNavigateToRules: () => Promise<undefined>;
    remoteDeleteUrl: string | undefined;
    remoteResetUrl: string | undefined;
    remoteEnableUrl: string | undefined;
    remoteDisableUrl: string | undefined;
    sloDetailsUrl: string;
};
export {};
