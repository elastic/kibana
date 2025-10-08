/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type {
  ExternalRuleSource,
  RuleSource,
} from '../../../../../../../common/api/detection_engine/model';
import type { BaseRuleParams, ExternalRuleSourceCamelCased } from '../../../../rule_schema';
import { createDefaultExternalRuleSource } from '../mergers/rule_source/create_default_external_rule_source';
import { createDefaultInternalRuleSource } from '../mergers/rule_source/create_default_internal_rule_source';

interface NormalizeRuleSourceArgs {
  immutable: BaseRuleParams['immutable'];
  ruleSource: BaseRuleParams['ruleSource'];
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
}: NormalizeRuleSourceArgs): RuleSource => {
  if (!ruleSource) {
    /**
     * The rule source object is not guaranteed to be present in a rule saved object. Those rules
     * which were created a long time ago and haven't been updated ever since won't have it.
     * However, in our domain model (`RuleResponse`) the rule source object is required - we always
     * return it from the rule management API endpoints. That's why when it's missing we normalize
     * it based on the legacy `immutable` field which is guaranteed to be always present.
     */
    return immutable ? createDefaultExternalRuleSource() : createDefaultInternalRuleSource();
  }

  if (ruleSource.type === 'internal') {
    return {
      type: ruleSource.type,
    };
  }

  if (ruleSource.customizedFields == null || ruleSource.hasBaseVersion == null) {
    /**
     * If rule source exists in the rule object but does not have the new customization-related
     * fields (`customizedFields` and `hasBaseVersion`), we normalize them to default values here.
     * The new fields are not guaranteed to be present in the rule source object and can be missing
     * in old rules which haven't been updated by teh user since a long time ago. However, in our
     * domain model (`ExternalRuleSource`) they are required, so we do the normalization.
     */
    return {
      type: ruleSource.type,
      is_customized: ruleSource.isCustomized,
      customized_fields: [],
      has_base_version: true,
    };
  }

  return {
    type: ruleSource.type,
    is_customized: ruleSource.isCustomized,
    customized_fields: normalizeCustomizedFields(ruleSource.customizedFields),
    has_base_version: ruleSource.hasBaseVersion ?? true,
  };
};

function normalizeCustomizedFields(
  customizedFields: ExternalRuleSourceCamelCased['customizedFields']
): ExternalRuleSource['customized_fields'] {
  if (customizedFields == null) {
    return [];
  }

  return customizedFields.map((f) => {
    return {
      field_name: f.fieldName,
    };
  });
}
