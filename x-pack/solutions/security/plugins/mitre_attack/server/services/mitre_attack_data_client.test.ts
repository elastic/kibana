/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ISavedObjectsRepository } from '@kbn/core-saved-objects-api-server';
import type { Logger } from '@kbn/core/server';
import { SavedObjectsErrorHelpers } from '@kbn/core/server';
import { MitreAttackDataClientImpl } from './mitre_attack_data_client';
import { MITRE_ATTACK_ENTITY_SO_TYPE } from '../../common/constants';
import type { MitreEntityAttributes } from '../../common/schema';

const DEFAULT_VERSION = '19.1';
const FRAMEWORK = 'enterprise';

const mockLogger = {
  debug: jest.fn(),
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
} as unknown as Logger;

const buildRawHit = (
  attrs: Partial<MitreEntityAttributes> & { id: string; name: string; type: string }
) => ({
  _score: 1.0,
  _source: {
    type: MITRE_ATTACK_ENTITY_SO_TYPE,
    [MITRE_ATTACK_ENTITY_SO_TYPE]: {
      ...attrs,
      framework: FRAMEWORK,
      framework_version: DEFAULT_VERSION,
      reference: attrs.reference ?? `https://example.com/${attrs.id}`,
      description: attrs.description ?? 'A description',
      revoked: attrs.revoked ?? false,
      deprecated: attrs.deprecated ?? false,
      semantic_content: `${attrs.name}\n\n${attrs.description ?? 'A description'}`,
      ...(attrs.type === 'tactic' ? { position: 1 } : {}),
      ...(attrs.type === 'technique' ? { tactic_ids: ['TA0001'] } : {}),
      ...(attrs.type === 'subtechnique' ? { tactic_ids: ['TA0001'], technique_id: 'T1059' } : {}),
    } as MitreEntityAttributes,
  },
});

const makeMockRepository = (
  overrides: Partial<ISavedObjectsRepository> = {}
): jest.Mocked<ISavedObjectsRepository> =>
  ({
    search: jest.fn().mockResolvedValue({ hits: { hits: [] } }),
    get: jest.fn(),
    bulkCreate: jest.fn(),
    bulkUpdate: jest.fn(),
    create: jest.fn(),
    ...overrides,
  } as unknown as jest.Mocked<ISavedObjectsRepository>);

describe('MitreAttackDataClientImpl', () => {
  let repository: jest.Mocked<ISavedObjectsRepository>;
  let client: MitreAttackDataClientImpl;

  beforeEach(() => {
    jest.clearAllMocks();
    repository = makeMockRepository();
    client = new MitreAttackDataClientImpl(repository, DEFAULT_VERSION, mockLogger);
  });

  describe('list()', () => {
    it('sends framework and framework_version filter terms', async () => {
      repository.search.mockResolvedValue({ hits: { hits: [] } } as never);
      await client.list({ framework: 'enterprise', frameworkVersion: '19.1' });

      const [opts] = repository.search.mock.calls[0];
      const { filter } = (opts.query as { bool: { filter: unknown[] } }).bool;
      expect(filter).toContainEqual({
        term: { [`${MITRE_ATTACK_ENTITY_SO_TYPE}.framework`]: 'enterprise' },
      });
      expect(filter).toContainEqual({
        term: { [`${MITRE_ATTACK_ENTITY_SO_TYPE}.framework_version`]: '19.1' },
      });
    });

    it('excludes revoked and deprecated by default (must_not)', async () => {
      repository.search.mockResolvedValue({ hits: { hits: [] } } as never);
      await client.list();

      const [opts] = repository.search.mock.calls[0];
      const { must_not } = (opts.query as { bool: { must_not: unknown[] } }).bool;
      expect(must_not).toContainEqual({
        term: { [`${MITRE_ATTACK_ENTITY_SO_TYPE}.revoked`]: true },
      });
      expect(must_not).toContainEqual({
        term: { [`${MITRE_ATTACK_ENTITY_SO_TYPE}.deprecated`]: true },
      });
    });

    it('drops must_not when includeInactive=true', async () => {
      repository.search.mockResolvedValue({ hits: { hits: [] } } as never);
      await client.list({ includeInactive: true });

      const [opts] = repository.search.mock.calls[0];
      const bool = (opts.query as { bool: Record<string, unknown> }).bool;
      expect(bool.must_not).toBeUndefined();
    });

    it('adds types filter when types are provided', async () => {
      repository.search.mockResolvedValue({ hits: { hits: [] } } as never);
      await client.list({ types: ['technique', 'subtechnique'] });

      const [opts] = repository.search.mock.calls[0];
      const { filter } = (opts.query as { bool: { filter: unknown[] } }).bool;
      expect(filter).toContainEqual({
        terms: { [`${MITRE_ATTACK_ENTITY_SO_TYPE}.type`]: ['technique', 'subtechnique'] },
      });
    });

    it('strips semantic_content from returned entities', async () => {
      const hit = buildRawHit({ id: 'T1059', name: 'Command', type: 'technique' });
      repository.search.mockResolvedValue({ hits: { hits: [hit] } } as never);
      const entities = await client.list();

      expect(entities).toHaveLength(1);
      expect((entities[0] as unknown as Record<string, unknown>).semantic_content).toBeUndefined();
      expect(entities[0].id).toBe('T1059');
    });

    it('uses namespaces wildcard for agnostic SO type', async () => {
      repository.search.mockResolvedValue({ hits: { hits: [] } } as never);
      await client.list();

      const [opts] = repository.search.mock.calls[0];
      expect(opts.namespaces).toEqual(['*']);
    });
  });

  describe('search() keyword mode', () => {
    it('emits multi_match clause with field boosts', async () => {
      repository.search.mockResolvedValue({ hits: { hits: [] } } as never);
      await client.search({ query: 'command injection', mode: 'keyword' });

      const [opts] = repository.search.mock.calls[0];
      const { must } = (opts.query as { bool: { must: unknown[] } }).bool;
      expect(must).toContainEqual({
        multi_match: {
          query: 'command injection',
          fields: [
            `${MITRE_ATTACK_ENTITY_SO_TYPE}.name.text^3`,
            `${MITRE_ATTACK_ENTITY_SO_TYPE}.description`,
            `${MITRE_ATTACK_ENTITY_SO_TYPE}.id^2`,
          ],
        },
      });
    });

    it('does NOT emit a semantic clause in keyword mode', async () => {
      repository.search.mockResolvedValue({ hits: { hits: [] } } as never);
      await client.search({ query: 'phishing', mode: 'keyword' });

      const [opts] = repository.search.mock.calls[0];
      const { must } = (opts.query as { bool: { must: unknown[] } }).bool;
      const hasSemanticClause = must.some(
        (c) => typeof c === 'object' && c !== null && 'semantic' in c
      );
      expect(hasSemanticClause).toBe(false);
    });
  });

  describe('search() semantic mode', () => {
    it('emits semantic clause on semantic_content field', async () => {
      repository.search.mockResolvedValue({ hits: { hits: [] } } as never);
      await client.search({ query: 'lateral movement via pass the hash', mode: 'semantic' });

      const [opts] = repository.search.mock.calls[0];
      const { must } = (opts.query as { bool: { must: unknown[] } }).bool;
      expect(must).toContainEqual({
        semantic: {
          field: `${MITRE_ATTACK_ENTITY_SO_TYPE}.semantic_content`,
          query: 'lateral movement via pass the hash',
        },
      });
    });

    it('does NOT emit a multi_match clause in semantic mode', async () => {
      repository.search.mockResolvedValue({ hits: { hits: [] } } as never);
      await client.search({ query: 'persistence', mode: 'semantic' });

      const [opts] = repository.search.mock.calls[0];
      const { must } = (opts.query as { bool: { must: unknown[] } }).bool;
      const hasMultiMatchClause = must.some(
        (c) => typeof c === 'object' && c !== null && 'multi_match' in c
      );
      expect(hasMultiMatchClause).toBe(false);
    });

    it('returns score from _score', async () => {
      const hit = buildRawHit({ id: 'T1078', name: 'Valid Accounts', type: 'technique' });
      hit._score = 4.2;
      repository.search.mockResolvedValue({ hits: { hits: [hit] } } as never);

      const results = await client.search({ query: 'valid accounts', mode: 'semantic' });
      expect(results[0].score).toBe(4.2);
    });
  });

  describe('search() default mode', () => {
    it('defaults to keyword mode when mode is not specified', async () => {
      repository.search.mockResolvedValue({ hits: { hits: [] } } as never);
      await client.search({ query: 'exploit' });

      const [opts] = repository.search.mock.calls[0];
      const { must } = (opts.query as { bool: { must: unknown[] } }).bool;
      const hasMultiMatch = must.some(
        (c) => typeof c === 'object' && c !== null && 'multi_match' in c
      );
      expect(hasMultiMatch).toBe(true);
    });
  });

  describe('getById()', () => {
    it('fetches using the composite SO id', async () => {
      repository.get = jest.fn().mockResolvedValue({
        id: 'enterprise:19.1:T1059',
        type: MITRE_ATTACK_ENTITY_SO_TYPE,
        attributes: {
          framework: 'enterprise',
          framework_version: '19.1',
          id: 'T1059',
          name: 'Command and Scripting Interpreter',
          type: 'technique',
          reference: 'https://example.com/T1059',
          description: 'Some description',
          revoked: false,
          deprecated: false,
          tactic_ids: ['TA0002'],
          semantic_content: 'Command and Scripting Interpreter\n\nSome description',
        } as MitreEntityAttributes,
        references: [],
      });

      const entity = await client.getById('T1059');
      expect(repository.get).toHaveBeenCalledWith(
        MITRE_ATTACK_ENTITY_SO_TYPE,
        `enterprise:${DEFAULT_VERSION}:T1059`
      );
      expect(entity?.id).toBe('T1059');
      expect(
        (entity as unknown as Record<string, unknown> | undefined)?.semantic_content
      ).toBeUndefined();
    });

    it('returns undefined on 404', async () => {
      const notFoundErr = SavedObjectsErrorHelpers.createGenericNotFoundError(
        MITRE_ATTACK_ENTITY_SO_TYPE,
        'enterprise:19.1:NOTEXIST'
      );
      repository.get = jest.fn().mockRejectedValue(notFoundErr);

      const result = await client.getById('NOTEXIST');
      expect(result).toBeUndefined();
    });

    it('rethrows non-404 errors', async () => {
      const boom = new Error('Internal error');
      repository.get = jest.fn().mockRejectedValue(boom);

      await expect(client.getById('T1059')).rejects.toThrow('Internal error');
    });

    it('strips semantic_content from the returned entity', async () => {
      repository.get = jest.fn().mockResolvedValue({
        id: 'enterprise:19.1:TA0001',
        type: MITRE_ATTACK_ENTITY_SO_TYPE,
        attributes: {
          framework: 'enterprise',
          framework_version: '19.1',
          id: 'TA0001',
          name: 'Initial Access',
          type: 'tactic',
          reference: 'https://example.com/TA0001',
          description: 'Gain initial access',
          revoked: false,
          deprecated: false,
          position: 1,
          semantic_content: 'Initial Access\n\nGain initial access',
        } as MitreEntityAttributes,
        references: [],
      });

      const entity = await client.getById('TA0001');
      expect(
        (entity as unknown as Record<string, unknown> | undefined)?.semantic_content
      ).toBeUndefined();
    });
  });
});
