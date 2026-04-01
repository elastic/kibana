/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from 'expect';
import { getLatestEntitiesIndexName } from '@kbn/entity-store/server';
import { hashEuid } from '@kbn/entity-store/common/domain/euid';
import { ENTITY_STORE_ROUTES, API_VERSIONS } from '@kbn/entity-store/common';
import { ENTITY_RESOLUTION_CSV_UPLOAD_URL } from '@kbn/security-solution-plugin/common/entity_analytics/entity_store/constants';
import type { FtrProviderContext } from '../../../../ftr_provider_context';
import { EntityStoreUtils } from '../../utils';

const TEST_PREFIX = 'csv-test:';

const testEntities = [
  {
    type: 'user' as const,
    id: `${TEST_PREFIX}golden`,
    doc: { user: { email: 'golden@test.com', name: 'golden' } },
  },
  {
    type: 'user' as const,
    id: `${TEST_PREFIX}alias1`,
    doc: { user: { email: 'shared@test.com', name: 'alias1' } },
  },
  {
    type: 'user' as const,
    id: `${TEST_PREFIX}alias2`,
    doc: { user: { email: 'shared@test.com', name: 'alias2' } },
  },
  {
    type: 'user' as const,
    id: `${TEST_PREFIX}standalone`,
    doc: { user: { email: 'standalone@test.com', name: 'standalone' } },
  },
  {
    type: 'user' as const,
    id: `${TEST_PREFIX}golden2`,
    doc: { user: { email: 'golden2@test.com', name: 'golden2' } },
  },
];

export default ({ getService }: FtrProviderContext) => {
  const supertest = getService('supertest');
  const es = getService('es');
  const log = getService('log');
  const retry = getService('retry');
  const entityStoreUtils = EntityStoreUtils(getService);

  const uploadCsv = (csvContent: string) =>
    supertest
      .post(ENTITY_RESOLUTION_CSV_UPLOAD_URL)
      .set('kbn-xsrf', 'true')
      .set('x-elastic-internal-origin', 'kibana')
      .set('elastic-api-version', '1')
      .attach('file', Buffer.from(csvContent), {
        filename: 'resolution.csv',
        contentType: 'text/csv',
      });

  const getResolutionGroup = async (entityId: string) => {
    const { body } = await supertest
      .get(ENTITY_STORE_ROUTES.RESOLUTION_GROUP)
      .query({ entity_id: entityId })
      .set('elastic-api-version', API_VERSIONS.internal.v2)
      .set('x-elastic-internal-origin', 'kibana')
      .expect(200);
    return body;
  };

  const seedEntities = async () => {
    const index = getLatestEntitiesIndexName('default');
    const operations = testEntities.flatMap((entity) => [
      { index: { _index: index, _id: hashEuid(entity.id) } },
      {
        '@timestamp': new Date().toISOString(),
        entity: {
          id: entity.id,
          name: entity.id,
          EngineMetadata: { Type: entity.type },
        },
        ...entity.doc,
      },
    ]);
    await es.bulk({ operations, refresh: true });
  };

  const waitForEntities = async () => {
    const index = getLatestEntitiesIndexName('default');
    await retry.waitForWithTimeout('seeded entities to be searchable', 30_000, async () => {
      const { count } = await es.count({
        index,
        query: { prefix: { 'entity.id': TEST_PREFIX } },
      });
      log.debug(`Waiting for ${testEntities.length} entities, found ${count}`);
      return count >= testEntities.length;
    });
  };

  const cleanEntities = async () => {
    const index = getLatestEntitiesIndexName('default');
    try {
      await es.deleteByQuery({
        index,
        query: { prefix: { 'entity.id': TEST_PREFIX } },
        refresh: true,
        conflicts: 'proceed',
      });
    } catch (e) {
      log.debug(`Cleanup: ${e.message}`);
    }
  };

  // Failing: See https://github.com/elastic/kibana/issues/260599
  describe.skip('@ess @serverless @skipInServerlessMKI Entity Resolution CSV Upload', () => {
    before(async () => {
      // Use enableEntityStoreV2 (without maintainer init) to prevent the
      // automated resolution maintainer from racing with CSV upload tests.
      // The maintainer would link entities sharing the same user.email,
      // interfering with the test's own resolution assertions.
      await entityStoreUtils.enableEntityStoreV2();
      await cleanEntities();
      await seedEntities();
      await waitForEntities();
    });

    afterEach(async () => {
      // Re-seed fresh entities for each test to avoid state leakage
      await cleanEntities();
      await seedEntities();
      await waitForEntities();
    });

    after(async () => {
      await cleanEntities();
    });

    it('should link matching entities to a target', async () => {
      const csv = ['type,user.email,resolved_to', `user,shared@test.com,${TEST_PREFIX}golden`].join(
        '\n'
      );

      const { body, status } = await uploadCsv(csv);

      expect(status).toBe(200);
      expect(body.total).toBe(1);
      expect(body.successful).toBe(1);
      expect(body.items[0].matchedEntities).toBe(2);
      expect(body.items[0].linkedEntities).toBe(2);

      const group = await getResolutionGroup(`${TEST_PREFIX}golden`);
      expect(group.group_size).toBe(3);
    });

    it('should be idempotent on re-upload', async () => {
      const csv = ['type,user.email,resolved_to', `user,shared@test.com,${TEST_PREFIX}golden`].join(
        '\n'
      );

      // First upload — links entities
      await uploadCsv(csv);

      // Ensure the resolved_to updates from linkEntities are visible
      await es.indices.refresh({ index: getLatestEntitiesIndexName('default') });

      // Second upload — same CSV, entities should be skipped
      const { body } = await uploadCsv(csv);

      expect(body.successful).toBe(1);
      expect(body.items[0].linkedEntities).toBe(0);
      expect(body.items[0].skippedEntities).toBe(2);
    });

    it('should return unmatched when no entities match', async () => {
      const csv = ['type,user.email,resolved_to', `user,nobody@test.com,${TEST_PREFIX}golden`].join(
        '\n'
      );

      const { body } = await uploadCsv(csv);

      expect(body.unmatched).toBe(1);
      expect(body.items[0].status).toBe('unmatched');
    });

    it('should filter out the target entity itself from matches', async () => {
      const csv = ['type,user.email,resolved_to', `user,golden@test.com,${TEST_PREFIX}golden`].join(
        '\n'
      );

      const { body } = await uploadCsv(csv);

      expect(body.unmatched).toBe(1);
    });

    it('should error when target entity not found', async () => {
      const csv = [
        'type,user.email,resolved_to',
        `user,shared@test.com,${TEST_PREFIX}nonexistent`,
      ].join('\n');

      const { body } = await uploadCsv(csv);

      expect(body.failed).toBe(1);
      expect(body.items[0].error).toContain('not found');
    });

    it('should error when target is an alias', async () => {
      // First link alias1 to golden
      const linkCsv = [
        'type,user.email,resolved_to',
        `user,shared@test.com,${TEST_PREFIX}golden`,
      ].join('\n');
      await uploadCsv(linkCsv);

      // Now try to use alias1 as a target
      const csv = [
        'type,user.email,resolved_to',
        `user,standalone@test.com,${TEST_PREFIX}alias1`,
      ].join('\n');

      const { body } = await uploadCsv(csv);

      expect(body.failed).toBe(1);
      expect(body.items[0].error).toContain('is an alias of');
    });

    it('should error on chain resolution (alias already linked to different target)', async () => {
      // Link alias1 to golden
      const csv1 = [
        'type,user.email,resolved_to',
        `user,shared@test.com,${TEST_PREFIX}golden`,
      ].join('\n');
      await uploadCsv(csv1);

      // Try to link the same aliases to golden2
      const csv2 = [
        'type,user.email,resolved_to',
        `user,shared@test.com,${TEST_PREFIX}golden2`,
      ].join('\n');

      const { body } = await uploadCsv(csv2);

      expect(body.failed).toBe(1);
      expect(body.items[0].error).toContain('already resolved');
    });

    it('should handle row validation errors', async () => {
      const csv = [
        'type,user.email,resolved_to',
        `invalid_type,test@test.com,${TEST_PREFIX}golden`,
        `user,,${TEST_PREFIX}golden`,
        `user,test@test.com,`,
      ].join('\n');

      const { body } = await uploadCsv(csv);

      expect(body.total).toBe(3);
      expect(body.failed).toBe(3);
      expect(body.items[0].error).toContain('Invalid entity type');
      expect(body.items[1].error).toContain('No identifying fields');
      expect(body.items[2].error).toContain('Missing resolved_to');
    });

    it('should process mixed results independently', async () => {
      const csv = [
        'type,user.email,resolved_to',
        `user,shared@test.com,${TEST_PREFIX}golden`,
        `user,nobody@test.com,${TEST_PREFIX}golden`,
        `invalid_type,foo@test.com,${TEST_PREFIX}golden`,
        `user,bar@test.com,${TEST_PREFIX}nonexistent`,
      ].join('\n');

      const { body } = await uploadCsv(csv);

      expect(body.total).toBe(4);
      expect(body.successful).toBe(1);
      expect(body.unmatched).toBe(1);
      expect(body.failed).toBe(2);
      expect(body.items[0].status).toBe('success');
      expect(body.items[1].status).toBe('unmatched');
      expect(body.items[2].status).toBe('error');
      expect(body.items[3].status).toBe('error');
    });

    it('should return zeros for empty CSV', async () => {
      const csv = 'type,user.email,resolved_to\n';
      const { body } = await uploadCsv(csv);

      expect(body.total).toBe(0);
      expect(body.successful).toBe(0);
    });
  });
};
