import type { ObservabilityRuleTypeRegistry } from '../../../rules/create_observability_rule_type_registry';
import type { TopAlert } from '../../../typings/alerts';
export declare const parseAlert: (observabilityRuleTypeRegistry: ObservabilityRuleTypeRegistry) => (alert: Record<string, unknown>) => TopAlert;
