import type { Capabilities } from '@kbn/core-capabilities-common';
import type { RuleType, RuleTypeModel } from '@kbn/triggers-actions-ui-plugin/public';
import type { RecursiveReadonly } from '@kbn/utility-types';
import type { Rule } from '@kbn/triggers-actions-ui-plugin/public';
import type { TypeRegistry } from '@kbn/triggers-actions-ui-plugin/public/application/type_registry';
interface Props {
    capabilities: RecursiveReadonly<Capabilities>;
    rule: Rule | undefined;
    ruleType: RuleType<string, string> | undefined;
    ruleTypeRegistry: TypeRegistry<RuleTypeModel<any>>;
}
export declare function isRuleEditable({ capabilities, rule, ruleType, ruleTypeRegistry }: Props): boolean;
export {};
