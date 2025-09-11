/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import type { RequiredOptional } from '@kbn/zod-helpers';
import { transformAlertToRuleResponseAction } from '../../../../../../../common/detection_engine/transform_actions';
import { convertObjectKeysToCamelCase } from '../../../../../../utils/object_case_converters';
import type { BaseRuleParams, RuleSourceCamelCased } from '../../../../rule_schema';
import { migrateLegacyInvestigationFields } from '../../../utils/utils';
import { createDefaultExternalRuleSource } from '../mergers/rule_source/create_default_external_rule_source';

export interface NormalizedRuleParams extends RequiredOptional<BaseRuleParams> {
  ruleSource: Required<RuleSourceCamelCased>;
}

interface NormalizeRuleSourceParams {
  immutable: BaseRuleParams['immutable'];
  ruleSource: BaseRuleParams['ruleSource'];
}

export const normalizeRuleParams = (params: BaseRuleParams) => {
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
    description: params.description,
    risk_score: params.riskScore,
    severity: params.severity,
    buildingBlockType: params.buildingBlockType,
    namespace: params.namespace,
    note: params.note,
    license: params.license,
    outputIndex: params.outputIndex,
    timelineId: params.timelineId,
    timelineTitle: params.timelineTitle,
    meta: params.meta,
    ruleNameOverride: params.ruleNameOverride,
    timestampOverride: params.timestampOverride,
    timestampOverrideFallbackDisabled: params.timestampOverrideFallbackDisabled,
    author: params.author,
    falsePositives: params.falsePositives,
    from: params.from,
    rule_id: params.ruleId,
    maxSignals: params.maxSignals,
    riskScoreMapping: params.riskScoreMapping,
    severityMapping: params.severityMapping,
    threat: params.threat,
    to: params.to,
    references: params.references,
    version: params.version,
    exceptionsList: params.exceptionsList,
    immutable: params.immutable,
    related_integrations: params.relatedIntegrations ?? [],
    response_actions: params.responseActions?.map(transformAlertToRuleResponseAction),
  };
};

/*
 * Since there's no mechanism to migrate all rules at the same time,
 * we cannot guarantee that the ruleSource params is present in all rules.
 * This function will normalize the ruleSource param, creating it if does
 * not exist in ES, based on the immutable param.
 */
export const normalizeRuleSource = ({
  immutable,
  ruleSource,
}: NormalizeRuleSourceParams): Required<RuleSourceCamelCased> => {
  if (!ruleSource) {
    /**
     * The rule source object is not guaranteed to be present in a rule saved object. Those rules
     * which were created a long time ago and haven't been updated ever since won't have it.
     * However, in our domain model (`RuleResponse`) the rule source object is required - we always
     * return it from the rule management API endpoints. That's why when it's missing we normalize
     * it based on the legacy `immutable` field which is guaranteed to be always present.
     */
    const normalizedRuleSource = immutable
      ? convertObjectKeysToCamelCase(createDefaultExternalRuleSource())
      : {
          type: 'internal' as const,
        };

    return normalizedRuleSource;
  } else if (
    ruleSource.type === 'external' &&
    (ruleSource.customizedFields === undefined || ruleSource.hasBaseVersion === undefined)
    /**
     * If rule source exists in the rule object but does not have the new customization-related
     * fields (`customizedFields` and `hasBaseVersion`), we normalize them to default values here.
     * The new fields are not guaranteed to be present in the rule source object and can be missing
     * in old rules which haven't been updated by teh user since a long time ago. However, in our
     * domain model (`ExternalRuleSource`) they are required, so we do the normalization.
     */
  ) {
    return {
      ...ruleSource,
      customizedFields: [],
      hasBaseVersion: true,
    };
  }
  return ruleSource as Required<RuleSourceCamelCased>;
};
