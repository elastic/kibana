/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { SavedObjectsClientContract } from '@kbn/core-saved-objects-api-server';
import type { Logger } from '@kbn/core/server';
import type { EntityStoreGlobalState } from './constants';
import {
  KI_AGGREGATION_GROUP_CAP_DEFAULT,
  KI_ENTITY_MIN_CONFIDENCE_DEFAULT,
  KI_PROMOTED_ENTITY_TYPES_DEFAULT,
  KI_PROMOTE_TO_TYPED_THRESHOLD_DEFAULT,
} from './constants';
import { EntityStoreGlobalStateClient } from '.';

const buildLogger = () =>
  ({
    debug: jest.fn(),
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
  } as unknown as Logger);

const buildSoClient = () => {
  const client = {
    find: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
  };
  return client as unknown as jest.Mocked<
    Pick<SavedObjectsClientContract, 'find' | 'create' | 'update' | 'delete'>
  > &
    SavedObjectsClientContract;
};

describe('EntityStoreGlobalStateClient', () => {
  describe('init()', () => {
    it('creates a new SO with KI defaults when nothing exists yet', async () => {
      const soClient = buildSoClient();
      soClient.find.mockResolvedValue({ total: 0, saved_objects: [] } as never);
      soClient.create.mockResolvedValue({
        attributes: {} as EntityStoreGlobalState,
      } as never);
      const client = new EntityStoreGlobalStateClient(soClient, 'default', buildLogger());

      await client.init();

      expect(soClient.create).toHaveBeenCalledTimes(1);
      const [, attributes] = soClient.create.mock.calls[0];
      const parsed = attributes as EntityStoreGlobalState;
      expect(parsed.knowledgeIndicators).toEqual({
        entityMinConfidence: KI_ENTITY_MIN_CONFIDENCE_DEFAULT,
        aggregationGroupCap: KI_AGGREGATION_GROUP_CAP_DEFAULT,
        promoteToTypedThreshold: KI_PROMOTE_TO_TYPED_THRESHOLD_DEFAULT,
        promotedEntityTypes: [...KI_PROMOTED_ENTITY_TYPES_DEFAULT],
      });
    });

    it('honors explicit knowledgeIndicators overrides at init time', async () => {
      const soClient = buildSoClient();
      soClient.find.mockResolvedValue({ total: 0, saved_objects: [] } as never);
      soClient.create.mockResolvedValue({
        attributes: {} as EntityStoreGlobalState,
      } as never);
      const client = new EntityStoreGlobalStateClient(soClient, 'default', buildLogger());

      await client.init({
        knowledgeIndicators: { entityMinConfidence: 70, aggregationGroupCap: 50 },
      });

      const [, attributes] = soClient.create.mock.calls[0];
      const parsed = attributes as EntityStoreGlobalState;
      expect(parsed.knowledgeIndicators).toEqual({
        entityMinConfidence: 70,
        aggregationGroupCap: 50,
        promoteToTypedThreshold: KI_PROMOTE_TO_TYPED_THRESHOLD_DEFAULT,
        promotedEntityTypes: [...KI_PROMOTED_ENTITY_TYPES_DEFAULT],
      });
    });

    it('updates the existing SO when one is already present (does not call create)', async () => {
      const soClient = buildSoClient();
      const existing: EntityStoreGlobalState = {
        historySnapshot: { status: 'started', frequency: '24h' } as never,
        logsExtraction: { lookbackPeriod: '3h', delay: '1m' } as never,
        knowledgeIndicators: { entityMinConfidence: 80, aggregationGroupCap: 150 },
      };
      soClient.find.mockResolvedValue({
        total: 1,
        saved_objects: [{ id: 'entity-store-global-state-default', attributes: existing }],
      } as never);
      soClient.update.mockResolvedValue({ attributes: existing } as never);
      const client = new EntityStoreGlobalStateClient(soClient, 'default', buildLogger());

      await client.init({
        knowledgeIndicators: { entityMinConfidence: 70, aggregationGroupCap: 50 },
      });

      expect(soClient.create).not.toHaveBeenCalled();
      expect(soClient.update).toHaveBeenCalledTimes(1);
    });
  });

  describe('updateKnowledgeIndicatorsConfig()', () => {
    const buildExisting = (overrides?: Partial<EntityStoreGlobalState>) =>
      ({
        historySnapshot: { status: 'started', frequency: '24h' },
        logsExtraction: { lookbackPeriod: '3h', delay: '1m' },
        knowledgeIndicators: {
          entityMinConfidence: 99,
          aggregationGroupCap: 200,
          promoteToTypedThreshold: KI_PROMOTE_TO_TYPED_THRESHOLD_DEFAULT,
          promotedEntityTypes: [...KI_PROMOTED_ENTITY_TYPES_DEFAULT],
        },
        ...overrides,
      } as EntityStoreGlobalState);

    it('reads, merges only the supplied fields, validates, and writes back the full block', async () => {
      const soClient = buildSoClient();
      const existing = buildExisting();
      soClient.find.mockResolvedValue({
        total: 1,
        saved_objects: [{ id: 'entity-store-global-state-default', attributes: existing }],
      } as never);
      soClient.update.mockResolvedValue({ attributes: existing } as never);
      const client = new EntityStoreGlobalStateClient(soClient, 'default', buildLogger());

      const merged = await client.updateKnowledgeIndicatorsConfig({ entityMinConfidence: 70 });

      // The merged result keeps the previously-stored aggregationGroupCap untouched
      expect(merged).toEqual({
        entityMinConfidence: 70,
        aggregationGroupCap: 200,
        promoteToTypedThreshold: KI_PROMOTE_TO_TYPED_THRESHOLD_DEFAULT,
        promotedEntityTypes: [...KI_PROMOTED_ENTITY_TYPES_DEFAULT],
      });

      // The SO write request also contains the full merged block (not just the partial)
      expect(soClient.update).toHaveBeenCalledTimes(1);
      const [, , attributes] = soClient.update.mock.calls[0];
      expect((attributes as EntityStoreGlobalState).knowledgeIndicators).toEqual({
        entityMinConfidence: 70,
        aggregationGroupCap: 200,
        promoteToTypedThreshold: KI_PROMOTE_TO_TYPED_THRESHOLD_DEFAULT,
        promotedEntityTypes: [...KI_PROMOTED_ENTITY_TYPES_DEFAULT],
      });
    });

    it('tolerates documents that pre-date the V2 migration (knowledgeIndicators absent in memory)', async () => {
      // In-flight reads that observe a pre-migration document must not fail
      // the update path; the partial is merged onto an empty base, then
      // Zod fills the rest with defaults.
      const soClient = buildSoClient();
      const preMigration = {
        historySnapshot: { status: 'started', frequency: '24h' },
        logsExtraction: { lookbackPeriod: '3h', delay: '1m' },
        // Synthetic empty KI block so `EntityStoreGlobalState.parse` is happy
        // before reaching the partial-merge step.
        knowledgeIndicators: {},
      } as unknown as EntityStoreGlobalState;
      soClient.find.mockResolvedValue({
        total: 1,
        saved_objects: [{ id: 'entity-store-global-state-default', attributes: preMigration }],
      } as never);
      soClient.update.mockResolvedValue({ attributes: preMigration } as never);
      const client = new EntityStoreGlobalStateClient(soClient, 'default', buildLogger());

      const merged = await client.updateKnowledgeIndicatorsConfig({ aggregationGroupCap: 50 });

      expect(merged).toEqual({
        entityMinConfidence: KI_ENTITY_MIN_CONFIDENCE_DEFAULT,
        aggregationGroupCap: 50,
        promoteToTypedThreshold: KI_PROMOTE_TO_TYPED_THRESHOLD_DEFAULT,
        promotedEntityTypes: [...KI_PROMOTED_ENTITY_TYPES_DEFAULT],
      });
    });

    it('preserves the existing promoteToTypedThreshold when only promotedEntityTypes is updated', async () => {
      const soClient = buildSoClient();
      const existing = buildExisting({
        knowledgeIndicators: {
          entityMinConfidence: 80,
          aggregationGroupCap: 200,
          promoteToTypedThreshold: 95,
          promotedEntityTypes: ['service'],
        },
      });
      soClient.find.mockResolvedValue({
        total: 1,
        saved_objects: [{ id: 'entity-store-global-state-default', attributes: existing }],
      } as never);
      soClient.update.mockResolvedValue({ attributes: existing } as never);
      const client = new EntityStoreGlobalStateClient(soClient, 'default', buildLogger());

      const merged = await client.updateKnowledgeIndicatorsConfig({ promotedEntityTypes: ['host'] });

      expect(merged).toEqual({
        entityMinConfidence: 80,
        aggregationGroupCap: 200,
        promoteToTypedThreshold: 95,
        promotedEntityTypes: ['host'],
      });
    });

    it('replaces promotedEntityTypes wholesale rather than appending', async () => {
      const soClient = buildSoClient();
      const existing = buildExisting({
        knowledgeIndicators: {
          entityMinConfidence: 80,
          aggregationGroupCap: 200,
          promoteToTypedThreshold: 95,
          promotedEntityTypes: ['service', 'host'],
        },
      });
      soClient.find.mockResolvedValue({
        total: 1,
        saved_objects: [{ id: 'entity-store-global-state-default', attributes: existing }],
      } as never);
      soClient.update.mockResolvedValue({ attributes: existing } as never);
      const client = new EntityStoreGlobalStateClient(soClient, 'default', buildLogger());

      const merged = await client.updateKnowledgeIndicatorsConfig({ promotedEntityTypes: [] });

      expect(merged.promotedEntityTypes).toEqual([]);
    });

    it('accepts an explicit null promoteToTypedThreshold to turn promotion off', async () => {
      const soClient = buildSoClient();
      const existing = buildExisting({
        knowledgeIndicators: {
          entityMinConfidence: 80,
          aggregationGroupCap: 200,
          promoteToTypedThreshold: 95,
          promotedEntityTypes: ['service'],
        },
      });
      soClient.find.mockResolvedValue({
        total: 1,
        saved_objects: [{ id: 'entity-store-global-state-default', attributes: existing }],
      } as never);
      soClient.update.mockResolvedValue({ attributes: existing } as never);
      const client = new EntityStoreGlobalStateClient(soClient, 'default', buildLogger());

      const merged = await client.updateKnowledgeIndicatorsConfig({
        promoteToTypedThreshold: null,
      });

      expect(merged.promoteToTypedThreshold).toBeNull();
    });

    it('throws when no SO exists for the namespace', async () => {
      const soClient = buildSoClient();
      soClient.find.mockResolvedValue({ total: 0, saved_objects: [] } as never);
      const client = new EntityStoreGlobalStateClient(soClient, 'default', buildLogger());

      await expect(
        client.updateKnowledgeIndicatorsConfig({ entityMinConfidence: 70 })
      ).rejects.toThrow();
      expect(soClient.update).not.toHaveBeenCalled();
    });

    it('rejects out-of-range entityMinConfidence (delegates to the Zod schema)', async () => {
      const soClient = buildSoClient();
      soClient.find.mockResolvedValue({
        total: 1,
        saved_objects: [{ id: 'entity-store-global-state-default', attributes: buildExisting() }],
      } as never);
      const client = new EntityStoreGlobalStateClient(soClient, 'default', buildLogger());

      await expect(
        client.updateKnowledgeIndicatorsConfig({ entityMinConfidence: 250 })
      ).rejects.toThrow();
      expect(soClient.update).not.toHaveBeenCalled();
    });
  });
});
