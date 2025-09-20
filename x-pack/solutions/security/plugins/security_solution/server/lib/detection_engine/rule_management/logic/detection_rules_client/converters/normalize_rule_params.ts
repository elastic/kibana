/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { convertObjectKeysToCamelCase } from '../../../../../../utils/object_case_converters';
import type { BaseRuleParams, RuleSourceCamelCased } from '../../../../rule_schema';
import { migrateLegacyInvestigationFields } from '../../../utils/utils';
import { createDefaultExternalRuleSource } from '../mergers/rule_source/create_default_external_rule_source';

interface NormalizeRuleSourceParams {
  immutable: BaseRuleParams['immutable'];
  ruleSource: BaseRuleParams['ruleSource'];
}

export interface NormalizedRuleParams extends BaseRuleParams {
  ruleSource: RuleSourceCamelCased;
}

/*
 * Since there's no mechanism to migrate all rules at the same time,
 * we cannot guarantee that the ruleSource params is present in all rules.
 * This function will normalize the ruleSource param, creating it if does
 * not exist in ES, based on the immutable param.
 */
export const normalizeRuleSource = ({
  immutable,
  ruleSource,
}: NormalizeRuleSourceParams): RuleSourceCamelCased => {
  if (!ruleSource) {
    const normalizedRuleSource: RuleSourceCamelCased = immutable
      ? convertObjectKeysToCamelCase(createDefaultExternalRuleSource())
      : {
          type: 'internal',
        };

    return normalizedRuleSource;
  } else if (
    ruleSource.type === 'external' &&
    // If ruleSource exists in the rule object but does not have new customized field related fields, we add them here
    (ruleSource.customizedFields === undefined || ruleSource.hasBaseVersion === undefined)
  ) {
    return {
      ...ruleSource,
      customizedFields: [],
      hasBaseVersion: true,
    };
  }
  return ruleSource;
};

export const normalizeRuleParams = (params: BaseRuleParams): NormalizedRuleParams => {
  const investigationFields = migrateLegacyInvestigationFields(params.investigationFields);
  const ruleSource = normalizeRuleSource({
    immutable: params.immutable,
    ruleSource: params.ruleSource,
  });

  return {
    ...params,
    // These fields are typed as optional in the data model, but they are required in our domain
    setup: params.setup ?? '',
    relatedIntegrations: params.relatedIntegrations ?? [],
    requiredFields: params.requiredFields ?? [],
    // Fields to normalize
    investigationFields,
    ruleSource,
  };
};
