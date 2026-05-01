/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from 'expect';
import { getEntitiesAlias, ENTITY_LATEST } from '@kbn/entity-store/server';
import type { Entity } from '@kbn/entity-store/common';
import { hashEuid } from '@kbn/entity-store/common/domain/euid';
import type { FtrProviderContext } from '../../../../ftr_provider_context';
import { assetCriticalityRouteHelpersFactory, EntityStoreUtils } from '../../utils';

const entities = [
  {
    type: 'host',
    id: 'host:alfredoa-pc119.acmecrm.com',
    doc: {
      entity: {
        id: 'host:alfredoa-pc119.acmecrm.com',
      },
      host: {
        name: 'alfredoa-pc119.acmecrm.com',
        hostname: 'ALFREDOA-PC119',
        domain: 'acmecrm.com',
      },
    },
  },
  {
    type: 'host',
    id: 'host:alyshacr-pc196.acmecrm.com',
    doc: {
      entity: {
        id: 'host:alyshacr-pc196.acmecrm.com',
      },
      host: {
        name: 'alyshacr-pc196.acmecrm.com',
        hostname: 'ALYSHACR-PC196',
        domain: 'acmecrm.com',
      },
    },
  },
  {
    type: 'host',
    id: 'host:1fe138db-b369-4342-acd2-5d464928a240',
    doc: {
      entity: {
        id: 'host:1fe138db-b369-4342-acd2-5d464928a240',
      },
      host: {
        name: 'MAC-SHAIN-LJTF9MJ',
        id: '1fe138db-b369-4342-acd2-5d464928a240',
      },
    },
  },
  {
    type: 'host',
    id: 'host:1f317303-88b2-433b-b84f-396db7a7e2f0',
    doc: {
      entity: {
        id: 'host:1f317303-88b2-433b-b84f-396db7a7e2f0',
      },
      host: {
        name: 'DESKTOP-LUIS-XPU3PTS',
        id: '1f317303-88b2-433b-b84f-396db7a7e2f0',
      },
    },
  },
];
export default ({ getService }: FtrProviderContext) => {
  const supertest = getService('supertest');
  const es = getService('es');
  const entityStoreUtils = EntityStoreUtils(getService);

  const assetCriticalityRoutes = assetCriticalityRouteHelpersFactory(supertest);

  describe('@ess @serverless @serverlessQA Asset Criticality CSV Upload V2', () => {
    before(async () => {
      await entityStoreUtils.enableEntityStoreV2();

      // Add some entities directly to the entity store index
      const operations = entities.flatMap((entity) => {
        const { entity: _entityFromDoc, ...restDoc } = entity.doc;
        const docId = hashEuid(entity.id);
        return [
          { index: { _index: getEntitiesAlias(ENTITY_LATEST, 'default'), _id: docId } },
          {
            '@timestamp': new Date().toISOString(),
            entity: {
              id: entity.id,
              EngineMetadata: {
                Type: entity.type,
              },
            },
            ...restDoc,
          },
        ];
      });
      await es.bulk({ operations, refresh: true });

      // Verify that none of them have asset criticality set
      const result = await entityStoreUtils.searchEntitiesV2(
        `${entities.map((e) => `entity.id:"${e.id}"`).join(' OR ')}`,
        { size: entities.length }
      );

      const returnedEntities = result.body.entities ?? [];
      expect(returnedEntities.length).toBe(entities.length);

      for (const entity of returnedEntities) {
        expect((entity.asset as Record<string, unknown>)?.criticality).toBeUndefined();
      }
    });

    after(async () => {
      // Use allSettled so a 403 (V2 mode cleared by a concurrent test's
      // cleanEngines()) does not fail the suite — the entity store uninstall
      // in cleanEngines already removes the underlying index documents.
      await Promise.allSettled(entities.map((e) => entityStoreUtils.deleteEntityV2(e.id)));
    });

    it('uploads CSV and updates asset criticality for a matched entity', async () => {
      const csv = [
        'type,host.name,host.hostname,host.domain,criticality_level',
        'host,,,acmecrm.com,high_impact', // should match 2
        'host,MAC-SHAIN-LJTF9MJ,,,' + 'medium_impact', // should match 1
        'host,DESKTOP-LUIS-XPU3PTS,,,' + 'low_impact', // should match 1
        'invalid_type,some-host,low_impact', // invalid entity type → failure
        'host,no-such-host,,,high_impact', // should match 0
      ].join('\n');

      const { body } = await assetCriticalityRoutes.uploadCsvV2(csv);

      expect(body.total).toBe(5);
      expect(body.successful).toBe(3);
      expect(body.failed).toBe(1);
      expect(body.unmatched).toBe(1);

      expect(body.items[0].status).toBe('success');
      expect(body.items[0].matchedEntities).toBe(2);

      expect(body.items[1].status).toBe('success');
      expect(body.items[1].matchedEntities).toBe(1);

      expect(body.items[2].status).toBe('success');
      expect(body.items[2].matchedEntities).toBe(1);

      expect(body.items[3].status).toBe('failure');
      expect(body.items[3].matchedEntities).toBe(0);
      expect(body.items[3].error).toBe(
        'Error processing row: Invalid entity type: "invalid_type". Must be one of: user, host, service, generic'
      );

      expect(body.items[4].status).toBe('unmatched');
      expect(body.items[4].matchedEntities).toBe(0);

      // Verify that none of them have asset criticality set
      const result = await entityStoreUtils.searchEntitiesV2(
        `${entities.map((e) => `entity.id:"${e.id}"`).join(' OR ')}`,
        { size: entities.length }
      );

      const returnedEntities = result.body.entities ?? [];
      expect(returnedEntities.length).toBe(entities.length);

      let entityById = returnedEntities.find(
        (e: Entity) => e.entity?.id === 'host:1f317303-88b2-433b-b84f-396db7a7e2f0'
      );
      expect((entityById.asset as Record<string, unknown>)?.criticality).toBe('low_impact');

      entityById = returnedEntities.find(
        (e: Entity) => e.entity?.id === 'host:1fe138db-b369-4342-acd2-5d464928a240'
      );
      expect((entityById.asset as Record<string, unknown>)?.criticality).toBe('medium_impact');

      entityById = returnedEntities.find(
        (e: Entity) => e.entity?.id === 'host:alfredoa-pc119.acmecrm.com'
      );
      expect((entityById.asset as Record<string, unknown>)?.criticality).toBe('high_impact');

      entityById = returnedEntities.find(
        (e: Entity) => e.entity?.id === 'host:alyshacr-pc196.acmecrm.com'
      );
      expect((entityById.asset as Record<string, unknown>)?.criticality).toBe('high_impact');
    });

    it('unassigns criticality from an entity using the "unassign" criticality level', async () => {
      // DESKTOP-LUIS-XPU3PTS was assigned low_impact in the previous test
      const csv = ['type,host.name,criticality_level', 'host,DESKTOP-LUIS-XPU3PTS,unassign'].join(
        '\n'
      );

      const { body } = await assetCriticalityRoutes.uploadCsvV2(csv);

      expect(body.total).toBe(1);
      expect(body.successful).toBe(1);
      expect(body.failed).toBe(0);
      expect(body.unmatched).toBe(0);
      expect(body.items[0].status).toBe('success');
      expect(body.items[0].matchedEntities).toBe(1);

      const result = await entityStoreUtils.searchEntitiesV2(
        `${entities.map((e) => `entity.id:"${e.id}"`).join(' OR ')}`,
        { size: entities.length }
      );

      const returnedEntities = result.body.entities ?? [];
      expect(returnedEntities.length).toBe(entities.length);

      const entityById = (id: string) => returnedEntities.find((e: Entity) => e.entity?.id === id);

      // Unassigned entity should have null criticality
      expect(
        (entityById('host:1f317303-88b2-433b-b84f-396db7a7e2f0')?.asset as Record<string, unknown>)
          ?.criticality
      ).toBeNull();

      // Other entities should retain their criticality from the previous test
      expect(
        (entityById('host:1fe138db-b369-4342-acd2-5d464928a240')?.asset as Record<string, unknown>)
          ?.criticality
      ).toBe('medium_impact');
      expect(
        (entityById('host:alfredoa-pc119.acmecrm.com')?.asset as Record<string, unknown>)
          ?.criticality
      ).toBe('high_impact');
      expect(
        (entityById('host:alyshacr-pc196.acmecrm.com')?.asset as Record<string, unknown>)
          ?.criticality
      ).toBe('high_impact');
    });

    it('rejects when CSV is missing required headers', async () => {
      // Missing the required 'type' column
      let csv = ['host.name,criticality_level', 'csv-test-host,high_impact'].join('\n');

      const { body: b1 } = await assetCriticalityRoutes.uploadCsvV2(csv, {
        expectStatusCode: 400,
      });
      expect(b1.message).toBe('CSV header is missing required fields: type');

      // Missing the required 'type' column
      csv = ['type,host.name', 'host,csv-test-host'].join('\n');
      const { body: b2 } = await assetCriticalityRoutes.uploadCsvV2(csv, {
        expectStatusCode: 400,
      });
      expect(b2.message).toBe('CSV header is missing required fields: criticality_level');
    });

    it('should handle all errors in the csv', async () => {
      const invalidRows = [
        'type,host.name,host.hostname,host.domain,criticality_level',
        'host,host-1,,,invalid_criticality', // invalid criticality
        'invalid_entity_type,host-1,Host1,,low_impact', // invalid entity
        'host,host-1,,,', // missing criticality
        ',host-1,,,low_impact', // missing entity type
        'host,host-1', // missing columns
        'host,host-1,,,low_impact,extra_column', // extra column
      ].join('\n');

      const { body } = await assetCriticalityRoutes.uploadCsvV2(invalidRows);

      expect(body.total).toBe(6);
      expect(body.successful).toBe(0);
      expect(body.failed).toBe(6);
      expect(body.unmatched).toBe(0);

      expect(body.items[0].status).toBe('failure');
      expect(body.items[0].matchedEntities).toBe(0);
      expect(body.items[0].error).toBe(
        `Error processing row: Invalid criticality level: \"invalid_criticality\". Must be one of: low_impact, medium_impact, high_impact, extreme_impact, unassign`
      );

      expect(body.items[1].status).toBe('failure');
      expect(body.items[1].matchedEntities).toBe(0);
      expect(body.items[1].error).toBe(
        `Error processing row: Invalid entity type: \"invalid_entity_type\". Must be one of: user, host, service, generic`
      );

      expect(body.items[2].status).toBe('failure');
      expect(body.items[2].matchedEntities).toBe(0);
      expect(body.items[2].error).toBe(
        `Error processing row: Invalid criticality level: \"\". Must be one of: low_impact, medium_impact, high_impact, extreme_impact, unassign`
      );

      expect(body.items[3].status).toBe('failure');
      expect(body.items[3].matchedEntities).toBe(0);
      expect(body.items[3].error).toBe(
        `Error processing row: Invalid entity type: \"\". Must be one of: user, host, service, generic`
      );

      expect(body.items[4].status).toBe('failure');
      expect(body.items[4].matchedEntities).toBe(0);
      expect(body.items[4].error).toBe(
        `Error processing row: Invalid criticality level: \"undefined\". Must be one of: low_impact, medium_impact, high_impact, extreme_impact, unassign`
      );

      expect(body.items[5].status).toBe('failure');
      expect(body.items[5].matchedEntities).toBe(0);
      expect(body.items[5].error).toBe(
        `Error processing row: x_content_parse_exception\n\tCaused by:\n\t\tparsing_exception: [term] query does not support array of values\n\tRoot causes:\n\t\tparsing_exception: [term] query does not support array of values`
      );
    });
  });
};
