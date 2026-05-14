/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { MigrationTranslationResultEnum } from '../../../common/siem_migrations/model/common.gen';
import type { UpdateRuleMigrationRule } from '../../../common/siem_migrations/model/rule_migration.gen';
import {
  convertEsqlQueryToTranslationResult,
  transformToInternalUpdateRuleMigrationData,
} from '../../lib/siem_migrations/rules/api/util/update_rules';

/**
 * Regression test for scheduled-fix item #3 in
 * `skills/automatic_migration/README.md`: pins the
 * `migration_translated_rule_update` tool's ES|QL revalidation semantics to
 * the in-tree route helper. If the helper's classification rules drift (new
 * "untranslatable" case, parser change, etc.), this test catches it at the
 * import boundary and forces the tool's documented behaviour to be updated
 * in lockstep — rather than the tool silently diverging from the
 * `PATCH ${SIEM_RULE_MIGRATION_RULES_PATH}` route.
 *
 * The tool itself does NOT keep its own copy of `convertEsqlQueryToTranslationResult`;
 * it calls `transformToInternalUpdateRuleMigrationData` (which internally
 * calls the converter). Asserting both functions here documents that the
 * AB tool relies on the route helper directly.
 */
describe('migration_translated_rule_update — ES|QL revalidation parity', () => {
  describe('convertEsqlQueryToTranslationResult (route helper)', () => {
    it('classifies an empty string as untranslatable', () => {
      expect(convertEsqlQueryToTranslationResult('')).toBe(
        MigrationTranslationResultEnum.untranslatable
      );
    });

    it('classifies a well-formed ES|QL query as full', () => {
      const validQuery = 'FROM logs-* | WHERE event.action == "login"';
      expect(convertEsqlQueryToTranslationResult(validQuery)).toBe(
        MigrationTranslationResultEnum.full
      );
    });

    it('classifies a malformed ES|QL query as partial', () => {
      // Missing pipe between source and WHERE — the parser produces errors.
      const invalidQuery = 'FROM logs-* WHERE event.action == "login"';
      expect(convertEsqlQueryToTranslationResult(invalidQuery)).toBe(
        MigrationTranslationResultEnum.partial
      );
    });
  });

  describe('transformToInternalUpdateRuleMigrationData (route helper)', () => {
    it('passes patches without an elastic_rule.query through unchanged', () => {
      const input: UpdateRuleMigrationRule = {
        id: 'rule-1',
        elastic_rule: { severity: 'high' },
      };
      expect(transformToInternalUpdateRuleMigrationData(input)).toEqual(input);
    });

    it('writes translation_result when elastic_rule.query is patched (full)', () => {
      const input: UpdateRuleMigrationRule = {
        id: 'rule-2',
        elastic_rule: { query: 'FROM logs-* | WHERE host.name == "edge"' },
      };
      const out = transformToInternalUpdateRuleMigrationData(input);
      expect(out.translation_result).toBe(MigrationTranslationResultEnum.full);
    });

    it('writes translation_result=untranslatable when elastic_rule.query is empty', () => {
      const input: UpdateRuleMigrationRule = {
        id: 'rule-3',
        elastic_rule: { query: '' },
      };
      const out = transformToInternalUpdateRuleMigrationData(input);
      expect(out.translation_result).toBe(MigrationTranslationResultEnum.untranslatable);
    });

    it('writes translation_result=partial when elastic_rule.query has parser errors', () => {
      const input: UpdateRuleMigrationRule = {
        id: 'rule-4',
        elastic_rule: { query: 'INVALID source.unknownCommand' },
      };
      const out = transformToInternalUpdateRuleMigrationData(input);
      expect(out.translation_result).toBe(MigrationTranslationResultEnum.partial);
    });

    it('preserves non-query patch fields when revalidating', () => {
      const input: UpdateRuleMigrationRule = {
        id: 'rule-5',
        elastic_rule: {
          query: 'FROM logs-* | WHERE host.name == "edge"',
          severity: 'critical',
          risk_score: 90,
        },
      };
      const out = transformToInternalUpdateRuleMigrationData(input);
      expect(out.elastic_rule).toEqual(input.elastic_rule);
      expect(out.translation_result).toBe(MigrationTranslationResultEnum.full);
    });
  });
});
