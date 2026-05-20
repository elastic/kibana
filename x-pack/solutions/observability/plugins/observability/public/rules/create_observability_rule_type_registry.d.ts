import type { RuleTypeModel, RuleTypeParams, RuleTypeRegistryContract } from '@kbn/triggers-actions-ui-plugin/public';
import type { ParsedTechnicalFields } from '@kbn/rule-registry-plugin/common/parse_technical_fields';
import type { AsDuration, AsPercent } from '../../common/utils/formatters';
export type ObservabilityRuleTypeFormatter = (options: {
    fields: ParsedTechnicalFields & Record<string, any>;
    formatters: {
        asDuration: AsDuration;
        asPercent: AsPercent;
    };
}) => {
    reason: string;
    link?: string;
    hasBasePath?: boolean;
};
export interface ObservabilityRuleTypeModel<Params extends RuleTypeParams = RuleTypeParams> extends Omit<RuleTypeModel<Params>, 'format'> {
    format: ObservabilityRuleTypeFormatter;
    priority?: number;
}
export declare function createObservabilityRuleTypeRegistry(ruleTypeRegistry: RuleTypeRegistryContract): {
    register: (type: ObservabilityRuleTypeModel<any>) => void;
    getFormatter: (typeId: string) => ObservabilityRuleTypeFormatter | undefined;
    list: () => string[];
};
export type ObservabilityRuleTypeRegistry = ReturnType<typeof createObservabilityRuleTypeRegistry>;
