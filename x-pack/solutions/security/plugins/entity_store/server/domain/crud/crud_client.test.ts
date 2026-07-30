/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { loggerMock, type MockedLogger } from '@kbn/logging-mocks';
import { elasticsearchServiceMock } from '@kbn/core/server/mocks';
import { CRUDClient } from './crud_client';
import { EntityStoreNotInstalledError } from '../errors';
import { hashEuid, getEuidFromObject } from '../../../common/domain/euid';
import {
  ENTITY_ASSET_CRITICALITY_UPDATED_TRIGGER_ID,
  ENTITY_RISK_SCORE_CHANGED_TRIGGER_ID,
} from '../../../common/workflow/triggers';
import type { Entity } from '../../../common';

// Drains all pending microtasks so fire-and-forget Promise chains complete.
const flushPromises = () => new Promise<void>((resolve) => setImmediate(resolve));

describe('CRUDClient', () => {
  let esClient: ReturnType<typeof elasticsearchServiceMock.createElasticsearchClient>;
  let logger: MockedLogger;
  let client: CRUDClient;

  beforeEach(() => {
    esClient = elasticsearchServiceMock.createElasticsearchClient();
    logger = loggerMock.create();
    client = new CRUDClient({ esClient, logger, namespace: 'default' });
  });

  describe('assertInstalled', () => {
    const entity = { entity: { id: 'test-id' } };

    it('createEntity throws EntityStoreNotInstalledError when index does not exist', async () => {
      esClient.indices.exists.mockResolvedValue(false);

      await expect(client.createEntity('generic', entity)).rejects.toThrow(
        EntityStoreNotInstalledError
      );
    });

    it('updateEntity throws EntityStoreNotInstalledError when index does not exist', async () => {
      esClient.indices.exists.mockResolvedValue(false);

      await expect(client.updateEntity('generic', entity, false)).rejects.toThrow(
        EntityStoreNotInstalledError
      );
    });

    it('bulkUpdateEntity throws EntityStoreNotInstalledError when index does not exist', async () => {
      esClient.indices.exists.mockResolvedValue(false);

      await expect(
        client.bulkUpdateEntity({ objects: [{ type: 'generic', doc: entity }] })
      ).rejects.toThrow(EntityStoreNotInstalledError);
    });

    it('createEntitiesFromSource throws EntityStoreNotInstalledError when index does not exist', async () => {
      esClient.indices.exists.mockResolvedValue(false);

      await expect(
        client.createEntitiesFromSource([
          {
            type: 'host',
            source: { host: { id: 'host-1' } },
            createdBy: 'risk_score_maintainer',
          },
        ])
      ).rejects.toThrow(EntityStoreNotInstalledError);
    });
  });

  describe('createEntitiesFromSource', () => {
    beforeEach(() => {
      esClient.indices.exists.mockResolvedValue(true);
    });

    // esClient.bulk's `operations` request field is optional in the ES client types; every
    // assertion below relies on it having been passed.
    const getBulkOperations = (callIndex: number) => {
      const operations = esClient.bulk.mock.calls[callIndex][0].operations;
      if (!operations) {
        throw new Error(`expected esClient.bulk call ${callIndex} to include operations`);
      }
      return operations;
    };

    it('rejects policy-ineligible requests without calling bulk', async () => {
      const result = await client.createEntitiesFromSource([
        {
          type: 'host',
          source: { host: { name: 'server1' } }, // no host.id
          createdBy: 'risk_score_maintainer',
        },
      ]);

      expect(result).toEqual({
        created: [],
        alreadyExists: [],
        rejected: [{ reason: 'host_missing_host_id' }],
      });
      expect(esClient.bulk).not.toHaveBeenCalled();
    });

    it('creates policy-accepted entities via a create-only bulk request', async () => {
      esClient.bulk.mockResolvedValue({ errors: false, items: [] } as any);

      const result = await client.createEntitiesFromSource([
        {
          type: 'host',
          source: { host: { id: 'host-1', name: 'server1' } },
          createdBy: 'risk_score_maintainer',
          fields: { 'entity.risk.calculated_score_norm': 70 },
        },
      ]);

      expect(result).toEqual({ created: ['host:host-1'], alreadyExists: [], rejected: [] });
      expect(esClient.bulk).toHaveBeenCalledTimes(1);

      const operations = getBulkOperations(0);
      expect(operations[0]).toEqual({ create: { _id: hashEuid('host:host-1') } });
      const createdDoc = operations[1] as Entity;
      expect(createdDoc.entity).toMatchObject({
        id: 'host:host-1',
        name: 'server1',
        created_by: 'risk_score_maintainer',
        EngineMetadata: { Type: 'host', UntypedId: 'host-1' },
        risk: { calculated_score_norm: 70 },
      });
      expect((createdDoc as any).host).toEqual({ id: 'host-1' });
    });

    it('creates local-namespace users with entity.confidence and composed entity.name', async () => {
      esClient.bulk.mockResolvedValue({ errors: false, items: [] } as any);

      const result = await client.createEntitiesFromSource([
        {
          type: 'user',
          source: { user: { name: 'alice' }, host: { id: 'host-1', name: 'workstation-1' } },
          createdBy: 'risk_score_maintainer',
        },
      ]);

      expect(result.created).toEqual(['user:alice@host-1@local']);
      const operations = getBulkOperations(0);
      const createdDoc = operations[1] as Entity;
      expect(createdDoc.entity).toMatchObject({
        id: 'user:alice@host-1@local',
        namespace: 'local',
        confidence: 'medium',
        name: 'alice@workstation-1',
        created_by: 'risk_score_maintainer',
      });
    });

    it('routes per-item 409 conflicts to alreadyExists (race with another creator)', async () => {
      esClient.bulk.mockResolvedValue({
        errors: true,
        items: [
          {
            create: {
              _id: hashEuid('service:api-gateway'),
              status: 409,
              error: { type: 'version_conflict_engine_exception' },
            },
          },
        ],
      } as any);

      const result = await client.createEntitiesFromSource([
        {
          type: 'service',
          source: { service: { name: 'api-gateway' } },
          createdBy: 'logs_extraction',
        },
      ]);

      expect(result).toEqual({
        created: [],
        alreadyExists: ['service:api-gateway'],
        rejected: [],
      });
    });

    it('drops entities that fail for a reason other than a conflict, and logs a warning', async () => {
      esClient.bulk.mockResolvedValue({
        errors: true,
        items: [
          {
            create: {
              _id: hashEuid('service:api-gateway'),
              status: 500,
              error: { type: 'some_other_exception' },
            },
          },
        ],
      } as any);

      const result = await client.createEntitiesFromSource([
        {
          type: 'service',
          source: { service: { name: 'api-gateway' } },
          createdBy: 'logs_extraction',
        },
      ]);

      expect(result).toEqual({ created: [], alreadyExists: [], rejected: [] });
      expect(logger.warn).toHaveBeenCalledWith(expect.stringContaining('some_other_exception'));
    });

    it('mixes created, rejected, and untouched-by-bulk results across a batch', async () => {
      esClient.bulk.mockResolvedValue({ errors: false, items: [] } as any);

      const result = await client.createEntitiesFromSource([
        { type: 'host', source: { host: { id: 'host-1' } }, createdBy: 'risk_score_maintainer' },
        {
          type: 'generic',
          source: { entity: { id: 'anything' } },
          createdBy: 'risk_score_maintainer',
        },
      ]);

      expect(result).toEqual({
        created: ['host:host-1'],
        alreadyExists: [],
        rejected: [{ reason: 'entity_type_not_creatable' }],
      });
    });
  });

  describe('asset criticality trigger emit', () => {
    let emitWorkflowTriggerEvent: jest.Mock;
    let clientWithEmit: CRUDClient;

    beforeEach(() => {
      esClient.indices.exists.mockResolvedValue(true);
      emitWorkflowTriggerEvent = jest.fn().mockResolvedValue(undefined);
      clientWithEmit = new CRUDClient({
        esClient,
        logger,
        namespace: 'default',
        emitWorkflowTriggerEvent,
      });
    });

    describe('updateEntity', () => {
      beforeEach(() => {
        esClient.update.mockResolvedValue({ result: 'updated' } as any);
        esClient.mget.mockResolvedValue({ docs: [] } as any);
      });

      it('emits trigger with correct payload when asset.criticality is patched', async () => {
        await clientWithEmit.updateEntity(
          'generic',
          { entity: { id: 'host-1' }, asset: { criticality: 'high_impact' } },
          true
        );

        expect(esClient.mget).toHaveBeenCalledTimes(1);
        expect(esClient.mget).toHaveBeenCalledWith(
          expect.objectContaining({ ids: [hashEuid('host-1')] })
        );
        expect(emitWorkflowTriggerEvent).toHaveBeenCalledTimes(1);
        expect(emitWorkflowTriggerEvent).toHaveBeenCalledWith(
          ENTITY_ASSET_CRITICALITY_UPDATED_TRIGGER_ID,
          expect.objectContaining({ entityType: 'generic', criticalityLevel: 'high_impact' })
        );
      });

      it('emits with criticalityLevel: null when criticality is cleared', async () => {
        await clientWithEmit.updateEntity(
          'generic',
          { entity: { id: 'host-1' }, asset: { criticality: null } },
          true
        );

        expect(esClient.mget).toHaveBeenCalledTimes(1);
        expect(esClient.mget).toHaveBeenCalledWith(
          expect.objectContaining({ ids: [hashEuid('host-1')] })
        );
        expect(emitWorkflowTriggerEvent).toHaveBeenCalledWith(
          ENTITY_ASSET_CRITICALITY_UPDATED_TRIGGER_ID,
          expect.objectContaining({ criticalityLevel: null })
        );
      });

      it('does not emit when the patched criticality matches the value already stored (idempotent re-write)', async () => {
        esClient.mget.mockResolvedValue({
          docs: [{ found: true, _source: { asset: { criticality: 'high_impact' } } }],
        } as any);

        await clientWithEmit.updateEntity(
          'generic',
          { entity: { id: 'host-1' }, asset: { criticality: 'high_impact' } },
          true
        );

        expect(esClient.mget).toHaveBeenCalledTimes(1);
        expect(emitWorkflowTriggerEvent).not.toHaveBeenCalled();
      });

      it('still emits when the patched criticality differs from the value already stored', async () => {
        esClient.mget.mockResolvedValue({
          docs: [{ found: true, _source: { asset: { criticality: 'low_impact' } } }],
        } as any);

        await clientWithEmit.updateEntity(
          'generic',
          { entity: { id: 'host-1' }, asset: { criticality: 'high_impact' } },
          true
        );

        expect(emitWorkflowTriggerEvent).toHaveBeenCalledWith(
          ENTITY_ASSET_CRITICALITY_UPDATED_TRIGGER_ID,
          expect.objectContaining({ criticalityLevel: 'high_impact' })
        );
      });

      it('does not emit when asset field is absent from the patch', async () => {
        await clientWithEmit.updateEntity('generic', { entity: { id: 'host-1' } }, true);

        expect(esClient.mget).not.toHaveBeenCalled();
        expect(emitWorkflowTriggerEvent).not.toHaveBeenCalled();
      });

      it('does not emit when asset is present but criticality field is absent', async () => {
        await clientWithEmit.updateEntity('generic', { entity: { id: 'host-1' }, asset: {} }, true);

        expect(esClient.mget).not.toHaveBeenCalled();
        expect(emitWorkflowTriggerEvent).not.toHaveBeenCalled();
      });

      it('does not emit when emitWorkflowTriggerEvent is not provided', async () => {
        // client without emit; should not throw
        await expect(
          client.updateEntity(
            'generic',
            { entity: { id: 'host-1' }, asset: { criticality: 'high_impact' } },
            true
          )
        ).resolves.not.toThrow();

        expect(esClient.mget).not.toHaveBeenCalled();
      });
    });

    describe('bulkUpdateEntity', () => {
      beforeEach(() => {
        esClient.mget.mockResolvedValue({ docs: [] } as any);
      });

      it('emits trigger for each successful entity with criticality', async () => {
        esClient.bulk.mockResolvedValue({ errors: false, items: [] } as any);

        await clientWithEmit.bulkUpdateEntity({
          force: true,
          objects: [
            {
              type: 'generic',
              doc: { entity: { id: 'host-1' }, asset: { criticality: 'high_impact' } },
            },
            {
              type: 'generic',
              doc: { entity: { id: 'host-2' }, asset: { criticality: 'low_impact' } },
            },
          ],
        });

        expect(esClient.mget).toHaveBeenCalledTimes(1);
        expect(esClient.mget).toHaveBeenCalledWith(
          expect.objectContaining({ ids: [hashEuid('host-1'), hashEuid('host-2')] })
        );
        expect(emitWorkflowTriggerEvent).toHaveBeenCalledTimes(2);
        expect(emitWorkflowTriggerEvent).toHaveBeenCalledWith(
          ENTITY_ASSET_CRITICALITY_UPDATED_TRIGGER_ID,
          expect.objectContaining({ criticalityLevel: 'high_impact' })
        );
        expect(emitWorkflowTriggerEvent).toHaveBeenCalledWith(
          ENTITY_ASSET_CRITICALITY_UPDATED_TRIGGER_ID,
          expect.objectContaining({ criticalityLevel: 'low_impact' })
        );
      });

      it('does not emit for entities that failed in the bulk operation', async () => {
        const doc = { entity: { id: 'host-1' }, asset: { criticality: 'high_impact' } };
        const failedId = hashEuid(getEuidFromObject('generic', doc)!);

        esClient.bulk.mockResolvedValue({
          errors: true,
          items: [
            {
              update: {
                _id: failedId,
                status: 404,
                error: { type: 'document_missing_exception', reason: 'not found' },
              },
            },
          ],
        } as any);

        await clientWithEmit.bulkUpdateEntity({
          force: true,
          objects: [{ type: 'generic', doc: doc as unknown as Entity }],
        });

        expect(esClient.mget).toHaveBeenCalledTimes(1);
        expect(esClient.mget).toHaveBeenCalledWith(
          expect.objectContaining({ ids: [hashEuid('host-1')] })
        );
        expect(emitWorkflowTriggerEvent).not.toHaveBeenCalled();
      });

      it('emits only for successful entities when the bulk response has mixed results', async () => {
        const failDoc = { entity: { id: 'host-fail' }, asset: { criticality: 'high_impact' } };
        const successDoc = { entity: { id: 'host-ok' }, asset: { criticality: 'low_impact' } };
        const failedId = hashEuid(getEuidFromObject('generic', failDoc)!);

        esClient.bulk.mockResolvedValue({
          errors: true,
          items: [
            {
              update: {
                _id: failedId,
                status: 404,
                error: { type: 'document_missing_exception', reason: 'not found' },
              },
            },
            { update: { _id: hashEuid(getEuidFromObject('generic', successDoc)!), status: 200 } },
          ],
        } as any);

        await clientWithEmit.bulkUpdateEntity({
          force: true,
          objects: [
            { type: 'generic', doc: failDoc as unknown as Entity },
            { type: 'generic', doc: successDoc as unknown as Entity },
          ],
        });

        expect(esClient.mget).toHaveBeenCalledTimes(1);
        expect(esClient.mget).toHaveBeenCalledWith(
          expect.objectContaining({ ids: [hashEuid('host-fail'), hashEuid('host-ok')] })
        );
        expect(emitWorkflowTriggerEvent).toHaveBeenCalledTimes(1);
        expect(emitWorkflowTriggerEvent).toHaveBeenCalledWith(
          ENTITY_ASSET_CRITICALITY_UPDATED_TRIGGER_ID,
          expect.objectContaining({ criticalityLevel: 'low_impact' })
        );
      });

      it('does not emit for entities without criticality in the patch', async () => {
        esClient.bulk.mockResolvedValue({ errors: false, items: [] } as any);

        await clientWithEmit.bulkUpdateEntity({
          force: true,
          objects: [
            { type: 'generic', doc: { entity: { id: 'host-1' } } },
            { type: 'generic', doc: { entity: { id: 'host-2' }, asset: {} } },
          ],
        });

        expect(esClient.mget).not.toHaveBeenCalled();
        expect(emitWorkflowTriggerEvent).not.toHaveBeenCalled();
      });

      it('logs a single warning when emit fails for multiple entities', async () => {
        esClient.bulk.mockResolvedValue({ errors: false, items: [] } as any);
        emitWorkflowTriggerEvent.mockRejectedValue(new Error('emit failed'));

        await clientWithEmit.bulkUpdateEntity({
          force: true,
          objects: [
            {
              type: 'generic',
              doc: { entity: { id: 'host-1' }, asset: { criticality: 'high_impact' } },
            },
            {
              type: 'generic',
              doc: { entity: { id: 'host-2' }, asset: { criticality: 'low_impact' } },
            },
          ],
        });

        await flushPromises();

        expect(esClient.mget).toHaveBeenCalledTimes(1);
        expect(esClient.mget).toHaveBeenCalledWith(
          expect.objectContaining({ ids: [hashEuid('host-1'), hashEuid('host-2')] })
        );
        expect(logger.warn).toHaveBeenCalledTimes(1);
        expect(logger.warn).toHaveBeenCalledWith(expect.stringContaining('2 of 2'));
      });
    });
  });

  describe('risk score trigger emit', () => {
    let emitWorkflowTriggerEvent: jest.Mock;
    let clientWithEmit: CRUDClient;

    beforeEach(() => {
      esClient.indices.exists.mockResolvedValue(true);
      emitWorkflowTriggerEvent = jest.fn().mockResolvedValue(undefined);
      clientWithEmit = new CRUDClient({
        esClient,
        logger,
        namespace: 'default',
        emitWorkflowTriggerEvent,
      });
    });

    describe('updateEntity', () => {
      beforeEach(() => {
        esClient.update.mockResolvedValue({ result: 'updated' } as any);
        esClient.mget.mockResolvedValue({ docs: [] } as any);
      });

      it('emits trigger when entity.risk.calculated_score_norm is present', async () => {
        await clientWithEmit.updateEntity(
          'generic',
          { entity: { id: 'host-1', risk: { calculated_score_norm: 75 } } },
          true
        );

        expect(esClient.mget).toHaveBeenCalledTimes(1);
        expect(esClient.mget).toHaveBeenCalledWith(
          expect.objectContaining({ ids: [hashEuid('host-1')] })
        );
        expect(emitWorkflowTriggerEvent).toHaveBeenCalledWith(
          ENTITY_RISK_SCORE_CHANGED_TRIGGER_ID,
          expect.objectContaining({
            entityType: 'generic',
            score: 75,
            previousScore: null,
            delta: null,
            direction: null,
          })
        );
      });

      it('emits with delta and direction when previous doc is found via mget', async () => {
        esClient.mget.mockResolvedValue({
          docs: [{ found: true, _source: { entity: { risk: { calculated_score_norm: 50 } } } }],
        } as any);

        await clientWithEmit.updateEntity(
          'generic',
          { entity: { id: 'host-1', risk: { calculated_score_norm: 75 } } },
          true
        );

        expect(esClient.mget).toHaveBeenCalledTimes(1);
        expect(esClient.mget).toHaveBeenCalledWith(
          expect.objectContaining({ ids: [hashEuid('host-1')] })
        );
        expect(emitWorkflowTriggerEvent).toHaveBeenCalledWith(
          ENTITY_RISK_SCORE_CHANGED_TRIGGER_ID,
          expect.objectContaining({ previousScore: 50, delta: 25, direction: 'increase' })
        );
      });

      it('emits with decrease direction when new score is lower than previous', async () => {
        esClient.mget.mockResolvedValue({
          docs: [{ found: true, _source: { entity: { risk: { calculated_score_norm: 80 } } } }],
        } as any);

        await clientWithEmit.updateEntity(
          'generic',
          { entity: { id: 'host-1', risk: { calculated_score_norm: 60 } } },
          true
        );

        expect(esClient.mget).toHaveBeenCalledTimes(1);
        expect(esClient.mget).toHaveBeenCalledWith(
          expect.objectContaining({ ids: [hashEuid('host-1')] })
        );
        expect(emitWorkflowTriggerEvent).toHaveBeenCalledWith(
          ENTITY_RISK_SCORE_CHANGED_TRIGGER_ID,
          expect.objectContaining({ delta: 20, direction: 'decrease' })
        );
      });

      it('does not emit when risk score field is absent from the patch', async () => {
        await clientWithEmit.updateEntity('generic', { entity: { id: 'host-1' } }, true);

        expect(esClient.mget).not.toHaveBeenCalled();
        expect(emitWorkflowTriggerEvent).not.toHaveBeenCalled();
      });
    });

    describe('bulkUpdateEntity', () => {
      beforeEach(() => {
        esClient.bulk.mockResolvedValue({ errors: false, items: [] } as any);
        esClient.mget.mockResolvedValue({ docs: [] } as any);
      });

      it('emits trigger for each successful entity with a risk score', async () => {
        await clientWithEmit.bulkUpdateEntity({
          force: true,
          objects: [
            {
              type: 'generic',
              doc: { entity: { id: 'host-1', risk: { calculated_score_norm: 70 } } },
            },
            {
              type: 'generic',
              doc: { entity: { id: 'host-2', risk: { calculated_score_norm: 30 } } },
            },
          ],
        });

        expect(esClient.mget).toHaveBeenCalledTimes(1);
        expect(esClient.mget).toHaveBeenCalledWith(
          expect.objectContaining({ ids: [hashEuid('host-1'), hashEuid('host-2')] })
        );
        expect(emitWorkflowTriggerEvent).toHaveBeenCalledTimes(2);
        expect(emitWorkflowTriggerEvent).toHaveBeenCalledWith(
          ENTITY_RISK_SCORE_CHANGED_TRIGGER_ID,
          expect.objectContaining({ score: 70 })
        );
        expect(emitWorkflowTriggerEvent).toHaveBeenCalledWith(
          ENTITY_RISK_SCORE_CHANGED_TRIGGER_ID,
          expect.objectContaining({ score: 30 })
        );
      });

      it('does not emit for entities that failed in the bulk operation', async () => {
        const doc = { entity: { id: 'host-1', risk: { calculated_score_norm: 70 } } };
        const failedId = hashEuid(getEuidFromObject('generic', doc)!);

        esClient.bulk.mockResolvedValue({
          errors: true,
          items: [
            {
              update: {
                _id: failedId,
                status: 404,
                error: { type: 'document_missing_exception', reason: 'not found' },
              },
            },
          ],
        } as any);

        await clientWithEmit.bulkUpdateEntity({
          force: true,
          objects: [{ type: 'generic', doc: doc as unknown as Entity }],
        });

        expect(esClient.mget).toHaveBeenCalledTimes(1);
        expect(esClient.mget).toHaveBeenCalledWith(
          expect.objectContaining({ ids: [hashEuid('host-1')] })
        );
        expect(emitWorkflowTriggerEvent).not.toHaveBeenCalled();
      });
    });
  });
});
