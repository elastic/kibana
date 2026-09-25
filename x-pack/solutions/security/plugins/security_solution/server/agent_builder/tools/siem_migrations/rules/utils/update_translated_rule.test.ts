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
  // Build the real validateEsql so the tests below can wrap it in a jest.fn and assert on calls.
  // sanitizeQuery inside strips [macro:…]/[lookup:…] before parsing, so the real validator
  // happily accepts placeholder-laden queries — the placeholder check in getEsqlQueryUpdatePatch
  // must run BEFORE the validator is ever called.
  const validateEsql = getValidateEsql({ logger: mockLogger });

  const validQuery = 'FROM logs-endpoint.events.process-* | LIMIT 10';

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('rejects a query that contains a macro placeholder without calling validateEsql', async () => {
    const spy = jest.fn(validateEsql);
    await expect(
      getEsqlQueryUpdatePatch('[macro:foo] | LIMIT 10', undefined, {
        validateEsql: spy,
        currentRule: makeCurrentRule(),
      })
    ).rejects.toThrow(/unresolved placeholder/);
    expect(spy).not.toHaveBeenCalled();
  });

  it('rejects a query that contains a lookup placeholder without calling validateEsql', async () => {
    const spy = jest.fn(validateEsql);
    await expect(
      getEsqlQueryUpdatePatch('FROM logs-* | WHERE field == [lookup:bar]', undefined, {
        validateEsql: spy,
        currentRule: makeCurrentRule(),
      })
    ).rejects.toThrow(/unresolved placeholder/);
    expect(spy).not.toHaveBeenCalled();
  });

  it('rejects a query that contains the missing-index-pattern placeholder without calling validateEsql', async () => {
    const spy = jest.fn(validateEsql);
    await expect(
      getEsqlQueryUpdatePatch(`FROM ${MISSING_INDEX_PATTERN_PLACEHOLDER} | LIMIT 10`, undefined, {
        validateEsql: spy,
        currentRule: makeCurrentRule(),
      })
    ).rejects.toThrow(/unresolved placeholder/);
    expect(spy).not.toHaveBeenCalled();
  });

  it('surfaces a validateEsql error verbatim', async () => {
    const spy = jest.fn(validateEsql);
    spy.mockResolvedValueOnce({ error: 'Unexpected token at position 5' });
    await expect(
      getEsqlQueryUpdatePatch('FROM logs-* BAD SYNTAX', undefined, {
        validateEsql: spy,
        currentRule: makeCurrentRule(),
      })
    ).rejects.toThrow('ES|QL validation failed: Unexpected token at position 5');
  });

  it('returns the patch on a valid query without integration_ids (no prebuilt match)', async () => {
    const result = await getEsqlQueryUpdatePatch(validQuery, undefined, {
      validateEsql,
      currentRule: makeCurrentRule(),
    });
    expect(result).toEqual({ query: validQuery, query_language: 'esql' });
    expect(result).not.toHaveProperty('prebuilt_rule_id');
  });

  it('includes integration_ids in the patch when supplied (no prebuilt match)', async () => {
    const result = await getEsqlQueryUpdatePatch(validQuery, ['endpoint'], {
      validateEsql,
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

    it('clears prebuilt_rule_id and resets title and description to the original rule values', async () => {
      const result = await getEsqlQueryUpdatePatch(validQuery, undefined, {
        validateEsql,
        currentRule: prebuiltMatchedRule,
      });
      expect(result).toEqual({
        query: validQuery,
        query_language: 'esql',
        prebuilt_rule_id: null,
        title: 'Original Rule Title',
        description: 'Original rule description',
      });
    });

    it('falls back to the original title when original_rule.description is empty', async () => {
      const ruleNoDescription = {
        ...prebuiltMatchedRule,
        original_rule: {
          ...prebuiltMatchedRule.original_rule,
          description: '',
        },
      } as unknown as RuleMigrationRule;

      const result = await getEsqlQueryUpdatePatch(validQuery, undefined, {
        validateEsql,
        currentRule: ruleNoDescription,
      });
      expect(result).toMatchObject({ description: 'Original Rule Title' });
    });

    it('includes integration_ids alongside the unmatch fields', async () => {
      const result = await getEsqlQueryUpdatePatch(validQuery, ['endpoint'], {
        validateEsql,
        currentRule: prebuiltMatchedRule,
      });
      expect(result).toMatchObject({ prebuilt_rule_id: null, integration_ids: ['endpoint'] });
    });

    it('still rejects placeholder queries before emitting unmatch fields', async () => {
      const spy = jest.fn(validateEsql);
      await expect(
        getEsqlQueryUpdatePatch('[macro:foo] | LIMIT 10', undefined, {
          validateEsql: spy,
          currentRule: prebuiltMatchedRule,
        })
      ).rejects.toThrow(/unresolved placeholder/);
      expect(spy).not.toHaveBeenCalled();
    });
  });
});

describe('getUpdatePrebuiltRulePatch', () => {
  it('maps id→prebuilt_rule_id and title→title', () => {
    const result = getUpdatePrebuiltRulePatch(
      { id: 'a2329f42-9a87-4e8c-9a4e-1b1e7d89f231', title: 'PowerShell Obfuscated Script Block' },
      undefined
    );
    expect(result).toEqual({
      prebuilt_rule_id: 'a2329f42-9a87-4e8c-9a4e-1b1e7d89f231',
      title: 'PowerShell Obfuscated Script Block',
    });
  });

  it('does not include integration_ids when not supplied', () => {
    const result = getUpdatePrebuiltRulePatch({ id: 'some-id', title: 'Some Rule' }, undefined);
    expect(result).not.toHaveProperty('integration_ids');
  });

  it('includes integration_ids in the patch when supplied', () => {
    const result = getUpdatePrebuiltRulePatch({ id: 'some-id', title: 'Some Rule' }, ['windows']);
    expect(result).toEqual({
      prebuilt_rule_id: 'some-id',
      title: 'Some Rule',
      integration_ids: ['windows'],
    });
  });
});
