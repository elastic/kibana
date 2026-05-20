import type { ObservabilityRuleTypeRegistry } from './create_observability_rule_type_registry';
declare const createRuleTypeRegistryMock: () => {
    getFormatter: () => () => string;
    registerFormatter: () => void;
    list: () => string[];
};
export declare const createObservabilityRuleTypeRegistryMock: () => ObservabilityRuleTypeRegistry & ReturnType<typeof createRuleTypeRegistryMock>;
export {};
