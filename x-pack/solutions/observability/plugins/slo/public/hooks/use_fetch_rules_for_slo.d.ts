import type { Rule } from '@kbn/triggers-actions-ui-plugin/public';
import type { BurnRateRuleParams } from '../typings';
interface Params {
    sloIds?: string[];
}
export declare function useFetchRulesForSlo({ sloIds }: Params): {
    data: Record<string, Rule<BurnRateRuleParams>[]> | undefined;
    isLoading: boolean;
    isSuccess: boolean;
    isError: boolean;
    refetchRules: () => void;
};
export {};
