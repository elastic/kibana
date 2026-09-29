/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type {
  ValidateEsqlInput,
  ValidateEsqlOutput,
} from '../../../../../lib/siem_migrations/common/task/agent/helpers/validate_esql';
import { MISSING_INDEX_PATTERN_PLACEHOLDER } from '../../../../../lib/siem_migrations/common/constants';
import type { RuleMigrationRule } from '../../../../../../common/siem_migrations/model/rule_migration.gen';

export interface UpdateElasticRulePatch {
  query?: string;
  query_language?: 'esql';
  prebuilt_rule_id?: string | null;
  integration_ids?: string[];
}

export type ValidateEsql = (input: ValidateEsqlInput) => Promise<ValidateEsqlOutput>;

const PLACEHOLDER_RE = /\[(macro|lookup):.*?\]/;

const hasUnresolvedPlaceholder = (query: string): boolean =>
  PLACEHOLDER_RE.test(query) || query.includes(MISSING_INDEX_PATTERN_PLACEHOLDER);

/**
 * Builds the elastic_rule patch for an ES|QL query update, clearing any prebuilt match.
 *
 * @throws if the query has unresolved placeholders — checked before `validateEsql`, which
 * sanitizes them away and would otherwise accept the query — or if validation fails.
 */
export const getEsqlQueryUpdatePatch = async (
  esqlQuery: string,
  integrationIds: string[] | undefined,
  { validateEsql, currentRule }: { validateEsql: ValidateEsql; currentRule: RuleMigrationRule }
): Promise<UpdateElasticRulePatch> => {
  if (hasUnresolvedPlaceholder(esqlQuery)) {
    throw new Error(
      'ES|QL query cannot be updated: it contains an unresolved placeholder (missing resource or invalid index pattern). Resolve all placeholders before applying the update.'
    );
  }

  const { error } = await validateEsql({ query: esqlQuery });
  if (error) {
    throw new Error(`ES|QL validation failed: ${error}`);
  }

  // If the rule was previously matched to a prebuilt rule, clear that match so the document
  // becomes a custom rule. `prebuilt_rule_id: null` explicitly unsets the field in ES
  // (partial-doc merge leaves omitted fields untouched). Title, description, severity and
  // risk score are derived from the original rule server-side.
  const unmatchFields: Partial<UpdateElasticRulePatch> = currentRule.elastic_rule?.prebuilt_rule_id
    ? { prebuilt_rule_id: null }
    : {};

  return {
    query: esqlQuery,
    query_language: 'esql',
    ...unmatchFields,
    ...(integrationIds != null ? { integration_ids: integrationIds } : {}),
  };
};

/** Builds the elastic_rule patch for a prebuilt rule match. Every other field is derived server-side from the prebuilt rule. */
export const getUpdatePrebuiltRulePatch = (prebuiltRuleId: string): UpdateElasticRulePatch => ({
  prebuilt_rule_id: prebuiltRuleId,
});
