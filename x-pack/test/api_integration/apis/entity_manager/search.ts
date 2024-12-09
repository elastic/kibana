/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import moment from 'moment';
import expect from 'expect';
import { FtrProviderContext } from '../../ftr_provider_context';
import { createEntitySourceDefinition, searchEntities } from './helpers/request';
import { createIndexWithDocuments } from './helpers/data_generation';

export default function ({ getService }: FtrProviderContext) {
  const esClient = getService('es');
  const supertest = getService('supertest');

  describe('_search API', () => {
    it('returns 404 when no matching sources', async () => {
      await searchEntities(supertest, { type: 'undefined-type' }, 404);
    });

    it('resolves entities from sources with timestamp', async () => {
      const now = moment();

      const deleteIndex = await createIndexWithDocuments(esClient, {
        index: 'index-1-with-services',
        properties: {
          custom_timestamp: { type: 'date' },
          'service.name': { type: 'keyword' },
        },
        documents: [
          {
            custom_timestamp: moment(now).subtract(1, 'minute').toISOString(),
            'service.name': 'service-one',
          },
          {
            custom_timestamp: moment(now).subtract(2, 'minute').toISOString(),
            'service.name': 'service-two',
          },
          {
            custom_timestamp: moment(now).subtract(1, 'hour').toISOString(),
            'service.name': 'service-three',
          },
        ],
      });

      await createEntitySourceDefinition(supertest, {
        source: {
          id: 'source-1-with-services',
          type_id: 'services-with-timestamp',
          index_patterns: ['index-1-with-services'],
          identity_fields: ['service.name'],
          metadata_fields: [],
          filters: [],
          timestamp_field: 'custom_timestamp',
        },
      });

      const { entities, errors } = await searchEntities(supertest, {
        type: 'services-with-timestamp',
        start: moment(now).subtract(10, 'minute').toISOString(),
        end: now.toISOString(),
      });

      expect(errors).toEqual([]);
      expect(entities).toEqual([
        {
          'entity.last_seen_timestamp': moment(now).subtract(1, 'minute').toISOString(),
          'entity.id': 'service-one',
          'entity.display_name': 'service-one',
          'entity.type': 'services-with-timestamp',
          'service.name': 'service-one',
        },
        {
          'entity.last_seen_timestamp': moment(now).subtract(2, 'minute').toISOString(),
          'entity.id': 'service-two',
          'entity.display_name': 'service-two',
          'entity.type': 'services-with-timestamp',
          'service.name': 'service-two',
        },
      ]);

      await deleteIndex();
    });

    it('resolves entities from sources without timestamp', async () => {
      const deleteIndex = await createIndexWithDocuments(esClient, {
        index: 'index-1-with-home-appliances',
        properties: { 'appliance.name': { type: 'keyword' } },
        documents: [
          { 'appliance.name': 'rice cooker' },
          { 'appliance.name': 'kettle' },
          { 'appliance.name': 'dishwasher' },
        ],
      });

      await createEntitySourceDefinition(supertest, {
        source: {
          id: 'appliances-no-timestamp',
          type_id: 'home-appliances',
          index_patterns: ['index-1-with-home-appliances'],
          identity_fields: ['appliance.name'],
          metadata_fields: [],
          filters: [],
        },
      });

      const { entities, errors } = await searchEntities(supertest, {
        type: 'home-appliances',
      });

      expect(errors).toEqual([]);
      expect(entities).toEqual([
        {
          'entity.id': 'dishwasher',
          'entity.display_name': 'dishwasher',
          'entity.type': 'home-appliances',
          'appliance.name': 'dishwasher',
        },
        {
          'entity.id': 'kettle',
          'entity.display_name': 'kettle',
          'entity.type': 'home-appliances',
          'appliance.name': 'kettle',
        },
        {
          'entity.id': 'rice cooker',
          'entity.display_name': 'rice cooker',
          'entity.type': 'home-appliances',
          'appliance.name': 'rice cooker',
        },
      ]);

      await deleteIndex();
    });

    it('merges entities from different sources', async () => {
      const now = moment();

      const deleteIndices = await Promise.all([
        createIndexWithDocuments(esClient, {
          index: 'index-1-with-hosts',
          properties: {
            '@timestamp': { type: 'date' },
            'host.name': { type: 'keyword' },
            'agent.name': { type: 'keyword' },
          },
          documents: [
            {
              '@timestamp': moment(now).subtract(1, 'minute').toISOString(),
              'host.name': 'host-uno',
              'agent.name': 'agent-a',
            },
            {
              '@timestamp': moment(now).subtract(3, 'minute').toISOString(),
              'host.name': 'host-uno',
              'agent.name': 'agent-b',
            },
            {
              '@timestamp': moment(now).subtract(3, 'minute').toISOString(),
              'host.name': 'host-dos',
              'agent.name': 'agent-3',
            },
            {
              '@timestamp': moment(now).subtract(4, 'minute').toISOString(),
              'host.name': 'host-tres',
            },
          ],
        }),

        createIndexWithDocuments(esClient, {
          index: 'index-2-with-hosts',
          properties: {
            timestamp: { type: 'date' },
            hostname_field: { type: 'keyword' },
            'agent.name': { type: 'keyword' },
          },
          documents: [
            {
              timestamp: moment(now).subtract(2, 'minute').toISOString(),
              hostname_field: 'host-uno',
              'agent.name': 'agent-1',
            },
            {
              timestamp: moment(now).subtract(2, 'minute').toISOString(),
              hostname_field: 'host-dos',
              'agent.name': 'agent-k',
            },
            {
              timestamp: moment(now).subtract(5, 'minute').toISOString(),
              hostname_field: 'host-four',
            },
          ],
        }),
      ]);

      await Promise.all([
        createEntitySourceDefinition(supertest, {
          source: {
            id: 'hosts-with-agents-1',
            type_id: 'hosts-with-agents',
            index_patterns: ['index-1-with-hosts'],
            identity_fields: ['host.name'],
            metadata_fields: [],
            filters: [],
            timestamp_field: '@timestamp',
          },
        }),
        createEntitySourceDefinition(supertest, {
          source: {
            id: 'hosts-with-agents-2',
            type_id: 'hosts-with-agents',
            index_patterns: ['index-2-with-hosts'],
            identity_fields: ['hostname_field'],
            metadata_fields: [],
            filters: [],
            timestamp_field: 'timestamp',
          },
        }),
      ]);

      const { entities, errors } = await searchEntities(supertest, {
        type: 'hosts-with-agents',
        start: moment(now).subtract(10, 'minute').toISOString(),
        end: moment(now).toISOString(),
        metadata_fields: ['agent.name'],
      });

      expect(errors).toEqual([]);
      expect(entities).toEqual([
        {
          'entity.id': 'host-uno',
          'entity.display_name': 'host-uno',
          'entity.type': 'hosts-with-agents',
          'entity.last_seen_timestamp': moment(now).subtract(1, 'minute').toISOString(),
          'host.name': 'host-uno',
          hostname_field: 'host-uno',
          'agent.name': expect.arrayContaining(['agent-a', 'agent-b', 'agent-1']),
        },
        {
          'entity.id': 'host-dos',
          'entity.display_name': 'host-dos',
          'entity.type': 'hosts-with-agents',
          'entity.last_seen_timestamp': moment(now).subtract(2, 'minute').toISOString(),
          'host.name': 'host-dos',
          hostname_field: 'host-dos',
          'agent.name': expect.arrayContaining(['agent-3', 'agent-k']),
        },
        {
          'entity.id': 'host-tres',
          'entity.display_name': 'host-tres',
          'entity.type': 'hosts-with-agents',
          'entity.last_seen_timestamp': moment(now).subtract(4, 'minute').toISOString(),
          'host.name': 'host-tres',
          'agent.name': null,
        },
        {
          'entity.id': 'host-four',
          'entity.display_name': 'host-four',
          'entity.type': 'hosts-with-agents',
          'entity.last_seen_timestamp': moment(now).subtract(5, 'minute').toISOString(),
          hostname_field: 'host-four',
          'agent.name': null,
        },
      ]);

      await Promise.all(deleteIndices.map((fn) => fn()));
    });

    it('resolves entities with multiple identity fields', async () => {
      const now = moment();

      const deleteIndex = await createIndexWithDocuments(esClient, {
        index: 'index-1-with-cars',
        properties: {
          '@timestamp': { type: 'date' },
          'car.brand': { type: 'keyword' },
          'car.model': { type: 'keyword' },
        },
        documents: [
          {
            '@timestamp': moment(now).subtract(2, 'minute').toISOString(),
            'car.brand': 'Fiat',
            'car.model': 'Multipla',
          },
          {
            '@timestamp': moment(now).subtract(1, 'minute').toISOString(),
            'car.brand': 'Citroen',
            'car.model': 'ZX break',
          },
        ],
      });

      await createEntitySourceDefinition(supertest, {
        source: {
          id: 'source-1-with-cars',
          type_id: 'most-refined-cars',
          index_patterns: ['index-1-with-cars'],
          identity_fields: ['car.brand', 'car.model'],
          metadata_fields: [],
          filters: [],
          timestamp_field: '@timestamp',
          display_name: 'car.model',
        },
      });

      const { entities, errors } = await searchEntities(supertest, {
        type: 'most-refined-cars',
        start: moment(now).subtract(5, 'minute').toISOString(),
        end: moment(now).toISOString(),
      });

      expect(errors).toEqual([]);
      expect(entities).toEqual([
        {
          'entity.last_seen_timestamp': moment(now).subtract(1, 'minute').toISOString(),
          'entity.id': 'Citroen:ZX break',
          'entity.display_name': 'ZX break',
          'entity.type': 'most-refined-cars',
          'car.brand': 'Citroen',
          'car.model': 'ZX break',
        },
        {
          'entity.last_seen_timestamp': moment(now).subtract(2, 'minute').toISOString(),
          'entity.id': 'Fiat:Multipla',
          'entity.display_name': 'Multipla',
          'entity.type': 'most-refined-cars',
          'car.brand': 'Fiat',
          'car.model': 'Multipla',
        },
      ]);

      await deleteIndex();
    });

    it('casts conflicting mappings to keywords', async () => {
      const deleteIndices = await Promise.all([
        await createIndexWithDocuments(esClient, {
          index: 'index-service-name-as-keyword',
          properties: { 'service.name': { type: 'keyword' } },
          documents: [{ 'service.name': 'service-name-as-keyword' }],
        }),

        await createIndexWithDocuments(esClient, {
          index: 'index-service-name-as-text',
          properties: { 'service.name': { type: 'text' } },
          documents: [{ 'service.name': 'service-name-as-text' }],
        }),

        await createIndexWithDocuments(esClient, {
          index: 'index-service-name-as-long',
          properties: { 'service.name': { type: 'long' } },
          documents: [{ 'service.name': 123 }],
        }),
      ]);

      await createEntitySourceDefinition(supertest, {
        source: {
          id: 'conflicting-mappings',
          type_id: 'type-with-conflicting-mappings',
          index_patterns: ['index-service-name-as-*'],
          identity_fields: ['service.name'],
          metadata_fields: [],
          filters: [],
        },
      });

      const { entities, errors } = await searchEntities(supertest, {
        type: 'type-with-conflicting-mappings',
      });

      expect(errors).toEqual([]);
      expect(entities).toEqual([
        {
          'entity.id': '123',
          'entity.display_name': '123',
          'entity.type': 'type-with-conflicting-mappings',
          'service.name': '123',
        },
        {
          'entity.id': 'service-name-as-keyword',
          'entity.display_name': 'service-name-as-keyword',
          'entity.type': 'type-with-conflicting-mappings',
          'service.name': 'service-name-as-keyword',
        },
        {
          'entity.id': 'service-name-as-text',
          'entity.display_name': 'service-name-as-text',
          'entity.type': 'type-with-conflicting-mappings',
          'service.name': 'service-name-as-text',
        },
      ]);

      await Promise.all(deleteIndices.map((fn) => fn()));
    });

    it('returns error if index does not exist', async () => {
      await createEntitySourceDefinition(supertest, {
        source: {
          id: 'non-existing-index',
          type_id: 'type-with-non-existing-index',
          index_patterns: ['non-existing-index-pattern*', 'non-existing-index'],
          identity_fields: ['service.name'],
          metadata_fields: [],
          filters: [],
          timestamp_field: '@timestamp',
        },
      });

      const { entities, errors } = await searchEntities(supertest, {
        type: 'type-with-non-existing-index',
      });
      expect(errors).toEqual([
        'No index found for source [non-existing-index] with index patterns [non-existing-index-pattern*, non-existing-index]',
      ]);
      expect(entities).toEqual([]);
    });

    it('returns error if mandatory fields are not mapped', async () => {
      const deleteIndex = await createIndexWithDocuments(esClient, {
        index: 'unmapped-id-fields',
        properties: { 'service.environment': { type: 'keyword' } },
        documents: [
          {
            '@timestamp': moment().toISOString(),
            'service.name': 'service-one',
            'service.environment': 'prod',
          },
        ],
      });

      await createEntitySourceDefinition(supertest, {
        source: {
          id: 'unmapped-fields',
          type_id: 'type-with-unmapped-id-fields',
          index_patterns: ['unmapped-id-fields'],
          identity_fields: ['service.name', 'service.environment'],
          metadata_fields: [],
          filters: [],
          timestamp_field: '@timestamp',
        },
      });

      const { entities, errors } = await searchEntities(supertest, {
        type: 'type-with-unmapped-id-fields',
      });
      expect(errors).toEqual([
        'Mandatory fields [service.name, @timestamp] are not mapped for source [unmapped-fields] with index patterns [unmapped-id-fields]',
      ]);
      expect(entities).toEqual([]);

      await deleteIndex();
    });
  });
}
