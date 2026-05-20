import type { RuleTypeParams } from '@kbn/alerting-plugin/common';
import type { CreateRuleRequestBody, CreateRuleResponse } from '@kbn/alerting-plugin/common/routes/rule/apis/create';
export declare function useCreateRule<Params extends RuleTypeParams = never>(): import("@kbn/react-query").UseMutationResult<CreateRuleResponse<Params>, Error, {
    rule: CreateRuleRequestBody<Params>;
}, {
    loadingToastId?: string;
}>;
