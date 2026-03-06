/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type {
  AlertFormatter,
  RuleTypeModel,
  RuleTypeParams,
  RuleTypeRegistryContract,
} from '@kbn/triggers-actions-ui-plugin/public';
import type { ParsedTechnicalFields } from '@kbn/rule-registry-plugin/common/parse_technical_fields';
import type { AsDuration, AsPercent } from '../../common/utils/formatters';

export type ObservabilityRuleTypeFormatter = (options: {
  fields: ParsedTechnicalFields & Record<string, any>;
  formatters: { asDuration: AsDuration; asPercent: AsPercent };
}) => { reason: string; link?: string; hasBasePath?: boolean };

export interface ObservabilityRuleTypeModel<Params extends RuleTypeParams = RuleTypeParams>
  extends Omit<RuleTypeModel<Params>, 'format'> {
  format: ObservabilityRuleTypeFormatter;
  priority?: number;
}

export function createObservabilityRuleTypeRegistry(ruleTypeRegistry: RuleTypeRegistryContract) {
  const formatters: Array<{
    typeId: string;
    priority: number;
    fn: ObservabilityRuleTypeFormatter;
  }> = [];

  return {
    register: (type: ObservabilityRuleTypeModel<any>) => {
      const { format, priority, ...rest } = type;
      formatters.push({ typeId: type.id, priority: priority || 0, fn: format });
      // Pass format to platform registry as well for platform-level "View in App" support
      // Cast to AlertFormatter since ObservabilityRuleTypeFormatter is compatible at runtime
      ruleTypeRegistry.register({ ...rest, format: format as AlertFormatter });
    },
    getFormatter: (typeId: string) => {
      return formatters.find((formatter) => formatter.typeId === typeId)?.fn;
    },
    list: () =>
      formatters.sort((a, b) => b.priority - a.priority).map((formatter) => formatter.typeId),
  };
}

export type ObservabilityRuleTypeRegistry = ReturnType<typeof createObservabilityRuleTypeRegistry>;
