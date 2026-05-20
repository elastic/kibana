import type { CreateSLOInput } from '@kbn/slo-schema';
import type { CreateRuleRequestBody } from '@kbn/alerting-plugin/common/routes/rule/apis/create';
import type { BurnRateRuleParams } from '../../../typings';
export declare function createBurnRateRuleRequestBody(slo: CreateSLOInput & {
    id: string;
}): CreateRuleRequestBody<BurnRateRuleParams>;
