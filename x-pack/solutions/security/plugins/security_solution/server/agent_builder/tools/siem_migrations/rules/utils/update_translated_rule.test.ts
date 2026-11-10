/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { loggingSystemMock } from '@kbn/core/server/mocks';
import { getValidateEsql } from '../../../../../lib/siem_migrations/common/task/agent/helpers/validate_esql';
import { MISSING_INDEX_PATTERN_PLACEHOLDER } from '../../../../../lib/siem_migrations/common/constants';
import { getEsqlQueryUpdatePatch, getUpdatePrebuiltRulePatch } from './update_translated_rule';
import type { RuleMigrationRule } from '../../../../../../common/siem_migrations/model/rule_migration.gen';

const makeCurrentRule = (
  overrides: Partial<RuleMigrationRule['elastic_rule']> = {}
): RuleMigrationRule =>
  ({
    id: 'rule-123',
    migration_id: 'migration-abc',
    original_rule: {
      id: 'orig-1',
      vendor: 'splunk',
      title: 'Original Rule Title',
      description: 'Original rule description',
      query: 'search index=main',
      query_language: 'spl',
    },
    elastic_rule: Object.keys(overrides).length ? overrides : undefined,
    status: 'pending',
    created_by: 'user',
    '@timestamp': '2024-01-01T00:00:00.000Z',
  } as unknown as RuleMigrationRule);

describe('getEsqlQueryUpdatePatch', () => {
  const mockLogger = loggingSystemMock.createLogger();
  const validateEsql = getValidateEsql({ logger: mockLogger });
  const validateEsqlSpy = jest.fn(validateEsql);

  const validQuery = 'FROM logs-endpoint.events.process-* | LIMIT 10';

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should reject a query that contains a macro placeholder without calling validateEsql', async () => {
    await expect(
      getEsqlQueryUpdatePatch('[macro:foo] | LIMIT 10', undefined, {
        validateEsql: validateEsqlSpy,
        currentRule: makeCurrentRule(),
      })
    ).rejects.toThrow(/unresolved placeholder/);
    expect(validateEsqlSpy).not.toHaveBeenCalled();
  });

  it('should reject a query that contains a lookup placeholder without calling validateEsql', async () => {
    await expect(
      getEsqlQueryUpdatePatch('FROM logs-* | WHERE field == [lookup:bar]', undefined, {
        validateEsql: validateEsqlSpy,
        currentRule: makeCurrentRule(),
      })
    ).rejects.toThrow(/unresolved placeholder/);
    expect(validateEsqlSpy).not.toHaveBeenCalled();
  });

  it('should reject a query that contains the missing-index-pattern placeholder without calling validateEsql', async () => {
    await expect(
      getEsqlQueryUpdatePatch(`FROM ${MISSING_INDEX_PATTERN_PLACEHOLDER} | LIMIT 10`, undefined, {
        validateEsql: validateEsqlSpy,
        currentRule: makeCurrentRule(),
      })
    ).rejects.toThrow(/unresolved placeholder/);
    expect(validateEsqlSpy).not.toHaveBeenCalled();
  });

  it('should surface a validateEsql error verbatim', async () => {
    validateEsqlSpy.mockResolvedValueOnce({ error: 'Unexpected token at position 5' });
    await expect(
      getEsqlQueryUpdatePatch('FROM logs-* BAD SYNTAX', undefined, {
        validateEsql: validateEsqlSpy,
        currentRule: makeCurrentRule(),
      })
    ).rejects.toThrow('ES|QL validation failed: Unexpected token at position 5');
  });

  it('should return the patch on a valid query without integration_ids (no prebuilt match)', async () => {
    const result = await getEsqlQueryUpdatePatch(validQuery, undefined, {
      validateEsql: validateEsqlSpy,
      currentRule: makeCurrentRule(),
    });
    expect(result).toEqual({ query: validQuery, query_language: 'esql' });
    expect(result).not.toHaveProperty('prebuilt_rule_id');
  });

  it('should include integration_ids in the patch when supplied (no prebuilt match)', async () => {
    const result = await getEsqlQueryUpdatePatch(validQuery, ['endpoint'], {
      validateEsql: validateEsqlSpy,
      currentRule: makeCurrentRule(),
    });
    expect(result).toEqual({
      query: validQuery,
      query_language: 'esql',
      integration_ids: ['endpoint'],
    });
  });

  describe('when the current rule has a prebuilt match', () => {
    const prebuiltMatchedRule = makeCurrentRule({ prebuilt_rule_id: 'some-prebuilt-uuid' });

    it('should only clear prebuilt_rule_id, leaving title and description to the server', async () => {
      const result = await getEsqlQueryUpdatePatch(validQuery, undefined, {
        validateEsql: validateEsqlSpy,
        currentRule: prebuiltMatchedRule,
      });
      expect(result).toEqual({
        query: validQuery,
        query_language: 'esql',
        prebuilt_rule_id: null,
      });
    });

    it('should include integration_ids alongside the unmatch fields', async () => {
      const result = await getEsqlQueryUpdatePatch(validQuery, ['endpoint'], {
        validateEsql: validateEsqlSpy,
        currentRule: prebuiltMatchedRule,
      });
      expect(result).toMatchObject({ prebuilt_rule_id: null, integration_ids: ['endpoint'] });
    });

    it('should still reject placeholder queries before emitting unmatch fields', async () => {
      await expect(
        getEsqlQueryUpdatePatch('[macro:foo] | LIMIT 10', undefined, {
          validateEsql: validateEsqlSpy,
          currentRule: prebuiltMatchedRule,
        })
      ).rejects.toThrow(/unresolved placeholder/);
      expect(validateEsqlSpy).not.toHaveBeenCalled();
    });
  });
});

describe('getUpdatePrebuiltRulePatch', () => {
  it('should send only prebuilt_rule_id so the server derives all other fields', () => {
    expect(getUpdatePrebuiltRulePatch('a2329f42-9a87-4e8c-9a4e-1b1e7d89f231')).toEqual({
      prebuilt_rule_id: 'a2329f42-9a87-4e8c-9a4e-1b1e7d89f231',
    });
  });
});
