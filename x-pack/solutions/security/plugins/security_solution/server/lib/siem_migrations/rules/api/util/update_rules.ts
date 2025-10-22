/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { parseEsqlQuery } from '@kbn/securitysolution-utils';
import type { MigrationTranslationResult } from '../../../../../../common/siem_migrations/model/common.gen';
import { MigrationTranslationResultEnum } from '../../../../../../common/siem_migrations/model/common.gen';
import { type UpdateRuleMigrationRule } from '../../../../../../common/siem_migrations/model/rule_migration.gen';
import type { InternalUpdateRuleMigrationRule } from '../../types';

export const isValidEsqlQuery = (esqlQuery: string) => {
  const { isEsqlQueryAggregating, hasMetadataOperator, errors } = parseEsqlQuery(esqlQuery);

  // Check if there are any syntax errors
  if (errors.length) {
    return false;
  }

  // non-aggregating query which does not have metadata, is not a valid one
  if (!isEsqlQueryAggregating && !hasMetadataOperator) {
    return false;
  }

  return true;
};

export const convertEsqlQueryToTranslationResult = (
  esqlQuery: string
): MigrationTranslationResult | undefined => {
  if (esqlQuery === '') {
    return MigrationTranslationResultEnum.untranslatable;
  }
  return isValidEsqlQuery(esqlQuery)
    ? MigrationTranslationResultEnum.full
    : MigrationTranslationResultEnum.partial;
};

export const transformToInternalUpdateRuleMigrationData = (
  ruleMigration: UpdateRuleMigrationRule
): InternalUpdateRuleMigrationRule => {
  if (ruleMigration.elastic_rule?.query == null) {
    return ruleMigration;
  }
  return {
    ...ruleMigration,
    translation_result: convertEsqlQueryToTranslationResult(ruleMigration.elastic_rule.query),
  };
};
