/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { apiTest } from '@kbn/scout-security';
import { expect } from '@kbn/scout-security/api';
import { COMMON_HEADERS, ENTITY_STORE_ROUTES, ENTITY_STORE_TAGS } from '../fixtures/constants';
import { FF_ENABLE_ENTITY_STORE_V2 } from '../../../../common';
import {
  ENTITY_CONFIDENCE,
  USER_ENTITY_NAMESPACE,
} from '../../../../common/domain/definitions/user_entity_constants';
import {
  expectedGenericEntities,
  expectedHostEntities,
  expectedServiceEntities,
  expectedUserEntities,
} from '../fixtures/entity_extraction_expected';
import { forceLogExtraction, ingestDoc, searchDocById } from '../fixtures/helpers';

apiTest.describe('Entity Store Main logs extraction', { tag: ENTITY_STORE_TAGS }, () => {
  let defaultHeaders: Record<string, string>;

  apiTest.beforeAll(async ({ samlAuth, apiClient, esArchiver, kbnClient }) => {
    const credentials = await samlAuth.asInteractiveUser('admin');
    defaultHeaders = {
      ...credentials.cookieHeader,
      ...COMMON_HEADERS,
    };

    // enable feature flag
    await kbnClient.uiSettings.update({
      [FF_ENABLE_ENTITY_STORE_V2]: true,
    });

    // Install the entity store
    const response = await apiClient.post(ENTITY_STORE_ROUTES.INSTALL, {
      headers: defaultHeaders,
      responseType: 'json',
      body: {},
    });
    expect(response.statusCode).toBe(201);

    await esArchiver.loadIfNeeded(
      'x-pack/solutions/security/plugins/entity_store/test/scout/api/es_archives/updates'
    );
  });

  apiTest.afterAll(async ({ apiClient }) => {
    const response = await apiClient.post(ENTITY_STORE_ROUTES.UNINSTALL, {
      headers: defaultHeaders,
      responseType: 'json',
      body: {},
    });
    expect(response.statusCode).toBe(200);
  });

  apiTest('Should extract properly extract host', async ({ apiClient, esClient }) => {
    const expectedResultCount = 20;

    const extractionResponse = await apiClient.post(
      ENTITY_STORE_ROUTES.FORCE_LOG_EXTRACTION('host'),
      {
        headers: defaultHeaders,
        responseType: 'json',
        body: {
          fromDateISO: '2026-01-20T11:00:00Z',
          toDateISO: '2026-01-20T13:00:00Z',
        },
      }
    );
    expect(extractionResponse.statusCode).toBe(200);
    expect(extractionResponse.body.success).toBe(true);
    expect(extractionResponse.body.pages).toBe(1);
    expect(extractionResponse.body.count).toBe(expectedResultCount);

    const entities = await esClient.search({
      index: '.entities.v2.latest.security_default',
      query: {
        bool: {
          filter: {
            term: { 'entity.EngineMetadata.Type': 'host' },
          },
        },
      },
      sort: '@timestamp:asc,entity.id:asc',
      size: 1000, // a lot just to be sure we are not capping it
    });

    expect(entities.hits.hits).toHaveLength(expectedResultCount);
    // it's deterministic because of the MD5 id;
    expect(entities.hits.hits).toMatchObject(expectedHostEntities);
  });

  apiTest('Should extract properly extract user', async ({ apiClient, esClient }) => {
    const expectedResultCount = 25;

    const extractionResponse = await apiClient.post(
      ENTITY_STORE_ROUTES.FORCE_LOG_EXTRACTION('user'),
      {
        headers: defaultHeaders,
        responseType: 'json',
        body: {
          fromDateISO: '2026-01-20T11:00:00Z',
          toDateISO: '2026-01-20T13:00:00Z',
        },
      }
    );
    expect(extractionResponse.statusCode).toBe(200);
    expect(extractionResponse.body.success).toBe(true);
    expect(extractionResponse.body.pages).toBe(1);
    expect(extractionResponse.body.count).toBe(expectedResultCount);

    const entities = await esClient.search({
      index: '.entities.v2.latest.security_default',
      query: {
        bool: {
          filter: {
            term: { 'entity.EngineMetadata.Type': 'user' },
          },
        },
      },
      sort: '@timestamp:asc,entity.id:asc',
      size: 1000, // a lot just to be sure we are not capping it
    });

    expect(entities.hits.hits).toHaveLength(expectedResultCount);
    // it's deterministic because of the MD5 id
    // manually checking object until we have a snapshot matcher
    expect(entities.hits.hits).toMatchObject(expectedUserEntities);
    // All user entities must have entity.namespace (from fieldEvaluations) and entity.confidence (from whenConditionTrueSetFieldsPreAgg)
    for (const hit of entities.hits.hits) {
      const source = hit._source as Record<string, unknown>;
      expect(source.entity).toBeDefined();
      expect((source.entity as Record<string, unknown>).namespace).toBeDefined();
      expect((source.entity as Record<string, unknown>).confidence).toBeDefined();
    }
  });

  apiTest('Should extract properly extract service', async ({ apiClient, esClient }) => {
    const extractionResponse = await apiClient.post(
      ENTITY_STORE_ROUTES.FORCE_LOG_EXTRACTION('service'),
      {
        headers: defaultHeaders,
        responseType: 'json',
        body: {
          fromDateISO: '2026-01-20T11:00:00Z',
          toDateISO: '2026-01-20T13:00:00Z',
        },
      }
    );
    expect(extractionResponse.statusCode).toBe(200);
    expect(extractionResponse.body.success).toBe(true);
    expect(extractionResponse.body.pages).toBe(1);
    expect(extractionResponse.body.count).toBe(2);

    const entities = await esClient.search({
      index: '.entities.v2.latest.security_default',
      query: {
        bool: {
          filter: {
            term: { 'entity.EngineMetadata.Type': 'service' },
          },
        },
      },
      sort: '@timestamp:asc,entity.id:asc',
      size: 1000, // a lot just to be sure we are not capping it
    });

    expect(entities.hits.hits).toHaveLength(2);
    // it's deterministic because of the MD5 id
    // manually checking object until we have a snapshot matcher
    expect(entities.hits.hits).toMatchObject(expectedServiceEntities);
  });

  apiTest('Should extract properly extract generic', async ({ apiClient, esClient }) => {
    const extractionResponse = await apiClient.post(
      ENTITY_STORE_ROUTES.FORCE_LOG_EXTRACTION('generic'),
      {
        headers: defaultHeaders,
        responseType: 'json',
        body: {
          fromDateISO: '2026-01-20T11:00:00Z',
          toDateISO: '2026-01-20T13:00:00Z',
        },
      }
    );
    expect(extractionResponse.statusCode).toBe(200);
    expect(extractionResponse.body.success).toBe(true);
    expect(extractionResponse.body.pages).toBe(1);
    expect(extractionResponse.body.count).toBe(1);

    const entities = await esClient.search({
      index: '.entities.v2.latest.security_default',
      query: {
        bool: {
          filter: {
            term: { 'entity.EngineMetadata.Type': 'generic' },
          },
        },
      },
      sort: '@timestamp:asc,entity.id:asc',
      size: 1000, // a lot just to be sure we are not capping it
    });

    expect(entities.hits.hits).toHaveLength(1);
    // it's deterministic because of the MD5 id
    // manually checking object until we have a snapshot matcher
    expect(entities.hits.hits).toMatchObject(expectedGenericEntities);
  });

  apiTest('Should properly handle field retention strategies', async ({ apiClient, esClient }) => {
    // Ingest a document without sub_type
    await ingestDoc(esClient, {
      '@timestamp': '2026-02-13T11:00:00Z',
      event: { kind: 'asset', module: 'okta' },
      user: {
        id: 'latest-test',
        name: 'latest-test-name',
      },
    });

    const firstExtractionResponse = await forceLogExtraction(
      apiClient,
      defaultHeaders,
      'user',
      '2026-02-13T10:59:00Z',
      '2026-02-13T11:01:00Z'
    );
    expect(firstExtractionResponse.statusCode).toBe(200);
    expect(firstExtractionResponse.body).toMatchObject({ count: 1 });

    const beforeSubType = await searchDocById(esClient, 'user:latest-test@okta');

    expect(beforeSubType.hits.hits).toHaveLength(1);
    expect(beforeSubType.hits.hits[0]._version).toBe(1);
    expect(beforeSubType.hits.hits[0]._source).toMatchObject({
      '@timestamp': '2026-02-13T11:00:00.000Z',
      entity: {
        id: 'user:latest-test@okta',
        type: 'Identity',
        name: 'latest-test-name',
        namespace: 'okta',
        confidence: ENTITY_CONFIDENCE.High,
      },
    });

    // Add sub_type to the document
    await ingestDoc(esClient, {
      '@timestamp': '2026-02-13T11:01:00Z',
      event: { kind: 'asset', module: 'okta' },
      user: {
        id: 'latest-test',
        hash: ['hash-1', 'hash-2'],
        entity: {
          sub_type: 'Sub Type 1',
        },
      },
    });

    const secondExtractionResponse = await forceLogExtraction(
      apiClient,
      defaultHeaders,
      'user',
      '2026-02-13T11:00:00Z',
      '2026-02-13T11:02:00Z'
    );
    expect(secondExtractionResponse.statusCode).toBe(200);
    expect(secondExtractionResponse.body).toMatchObject({ count: 1 });

    const afterSubType = await searchDocById(esClient, 'user:latest-test@okta');
    expect(afterSubType.hits.hits).toHaveLength(1);
    expect(afterSubType.hits.hits[0]._version).toBe(2);
    expect(afterSubType.hits.hits[0]._source).toMatchObject({
      '@timestamp': '2026-02-13T11:01:00.000Z',
      entity: {
        id: 'user:latest-test@okta',
        type: 'Identity',
        name: 'latest-test-name',
        sub_type: 'Sub Type 1',
        namespace: 'okta',
        confidence: ENTITY_CONFIDENCE.High,
      },
      user: { hash: ['hash-1', 'hash-2'] },
    });

    // Update sub_type in between documents with null values
    await ingestDoc(esClient, {
      '@timestamp': '2026-02-13T11:02:01Z',
      event: { kind: 'asset', module: 'okta' },
      user: {
        id: 'latest-test',
        entity: {
          sub_type: 'Sub Type 2',
        },
      },
    });

    await ingestDoc(esClient, {
      '@timestamp': '2026-02-13T11:02:02Z',
      event: { kind: 'asset', module: 'okta' },
      user: {
        id: 'latest-test',
        hash: ['hash-3', 'hash-4'],
        entity: {
          // no sub_type
        },
      },
    });

    await ingestDoc(esClient, {
      '@timestamp': '2026-02-13T11:02:03Z',
      event: { kind: 'asset', module: 'okta' },
      user: {
        id: 'latest-test',
        hash: ['hash-1', 'hash-3'], // add duplicated hashes
        entity: {
          sub_type: 'Sub Type 3',
        },
      },
    });

    await ingestDoc(esClient, {
      '@timestamp': '2026-02-13T11:02:04Z',
      event: { kind: 'asset', module: 'okta' },
      user: {
        id: 'latest-test',
        hash: ['hash-5'],
        entity: {
          // no sub_type
        },
      },
    });

    const thirdExtractionResponse = await forceLogExtraction(
      apiClient,
      defaultHeaders,
      'user',
      '2026-02-13T11:01:00Z',
      '2026-02-13T11:03:00Z'
    );
    expect(thirdExtractionResponse.statusCode).toBe(200);
    expect(thirdExtractionResponse.body).toMatchObject({ count: 1 });

    const updatedSubType = await searchDocById(esClient, 'user:latest-test@okta');
    expect(updatedSubType.hits.hits).toHaveLength(1);
    expect(updatedSubType.hits.hits[0]._version).toBe(3);
    expect(updatedSubType.hits.hits[0]._source).toMatchObject({
      '@timestamp': '2026-02-13T11:02:04.000Z',
      entity: {
        id: 'user:latest-test@okta',
        type: 'Identity',
        name: 'latest-test-name',
        sub_type: 'Sub Type 3',
        namespace: 'okta',
        confidence: ENTITY_CONFIDENCE.High,
      },
      user: { hash: ['hash-1', 'hash-3', 'hash-4', 'hash-5', 'hash-2'] },
    });

    // Make sure latest is not overwritten from the document if not changed
    await ingestDoc(esClient, {
      '@timestamp': '2026-02-13T11:03:00Z',
      event: { kind: 'asset', module: 'okta' },
      user: {
        id: 'latest-test',
        domain: 'example.com',
        hash: ['hash-6', 'hash-7', 'hash-8', 'hash-9', 'hash-10', 'hash-11'],
      },
    });

    const fourthExtractionResponse = await forceLogExtraction(
      apiClient,
      defaultHeaders,
      'user',
      '2026-02-13T11:02:00Z',
      '2026-02-13T11:04:00Z'
    );
    expect(fourthExtractionResponse.statusCode).toBe(200);
    expect(fourthExtractionResponse.body).toMatchObject({ count: 1 });

    const updatedLatestDomain = await searchDocById(esClient, 'user:latest-test@okta');
    expect(updatedLatestDomain.hits.hits).toHaveLength(1);
    expect(updatedLatestDomain.hits.hits[0]._version).toBe(4);
    expect(updatedLatestDomain.hits.hits[0]._source).toMatchObject({
      '@timestamp': '2026-02-13T11:03:00.000Z',
      entity: {
        id: 'user:latest-test@okta',
        type: 'Identity',
        name: 'latest-test-name',
        sub_type: 'Sub Type 3',
        namespace: 'okta',
        confidence: ENTITY_CONFIDENCE.High,
      },
      user: {
        hash: [
          'hash-1',
          'hash-10',
          'hash-11',
          'hash-3',
          'hash-4',
          'hash-5',
          'hash-6',
          'hash-7',
          'hash-8',
          'hash-2',
        ],
        domain: 'example.com',
      },
    });
  });

  apiTest(
    'Should apply user postAggFilter: IDP asset/iam paths and entity.id-after-LOOKUP; omit when no keep branch',
    async ({ apiClient, esClient }) => {
      const from = '2026-03-01T10:00:00Z';
      const to = '2026-03-01T12:00:00Z';

      // 1. IDP: asset event (Okta) — matches idpDocumentFilter + idpPostAggFilter → extracted without prior latest.
      await ingestDoc(esClient, {
        '@timestamp': '2026-03-01T10:01:00Z',
        event: { kind: 'asset', module: 'okta' },
        user: {
          id: 'postagg-idp-nolatest',
          name: 'IDP NoLatest',
        },
      });
      const ext1 = await forceLogExtraction(apiClient, defaultHeaders, 'user', from, to);
      expect(ext1.statusCode).toBe(200);
      const hit1 = await searchDocById(esClient, 'user:postagg-idp-nolatest@okta');
      expect(hit1.hits.hits).toHaveLength(1);
      expect(hit1.hits.hits[0]._source).toMatchObject({
        entity: {
          id: 'user:postagg-idp-nolatest@okta',
          type: 'Identity',
          name: 'IDP NoLatest',
          namespace: 'okta',
          confidence: ENTITY_CONFIDENCE.High,
        },
      });

      // 2. IDP: asset event — same user id; second doc updates latest (idpPostAggFilter still matches).
      await ingestDoc(esClient, {
        '@timestamp': '2026-03-01T10:02:00Z',
        event: { kind: 'asset', module: 'okta' },
        user: {
          id: 'postagg-idp-inlatest',
          name: 'IDP InLatest',
        },
      });
      await forceLogExtraction(apiClient, defaultHeaders, 'user', from, to);
      await ingestDoc(esClient, {
        '@timestamp': '2026-03-01T10:03:00Z',
        event: { kind: 'asset', module: 'okta' },
        user: {
          id: 'postagg-idp-inlatest',
          name: 'IDP InLatest Updated',
        },
      });
      const ext2 = await forceLogExtraction(apiClient, defaultHeaders, 'user', from, to);
      expect(ext2.statusCode).toBe(200);
      const hit2 = await searchDocById(esClient, 'user:postagg-idp-inlatest@okta');
      expect(hit2.hits.hits).toHaveLength(1);
      expect(hit2.hits.hits[0]._source).toMatchObject({
        entity: {
          id: 'user:postagg-idp-inlatest@okta',
          type: 'Identity',
          name: 'IDP InLatest Updated',
          namespace: 'okta',
          confidence: ENTITY_CONFIDENCE.High,
        },
      });

      // 3. Not non-IDP (no host.id). Matches idpDocumentFilter (user.id/name) but not idpPostAggFilter (not asset/iam)
      //    and not nonIdpPostAggFilter (no host.id) and no entity.id yet → no postAgg keep branch → not extracted.
      await ingestDoc(esClient, {
        '@timestamp': '2026-03-01T10:04:00Z',
        event: { kind: 'random-kind', module: 'okta' },
        user: {
          id: 'postagg-nopostaggkeep-nolatest',
          name: 'NoPostAggKeep NoLatest',
        },
      });
      const ext3 = await forceLogExtraction(apiClient, defaultHeaders, 'user', from, to);
      expect(ext3.statusCode).toBe(200);
      const hit3 = await searchDocById(esClient, 'user:postagg-nopostaggkeep-nolatest@okta');
      expect(hit3.hits.hits).toHaveLength(0);

      // 4. IDP: IAM user event (entityanalytics_ad) — matches idpPostAggFilter; namespace active_directory from fieldEvaluations.
      await ingestDoc(esClient, {
        '@timestamp': '2026-03-01T10:05:00Z',
        event: { category: 'iam', type: 'user', module: 'entityanalytics_ad' },
        user: {
          id: 'postagg-idp-iam-ad-inlatest',
          name: 'IDP IAM AD InLatest',
        },
      });
      const ext4 = await forceLogExtraction(apiClient, defaultHeaders, 'user', from, to);
      expect(ext4.statusCode).toBe(200);
      const hit4 = await searchDocById(
        esClient,
        'user:postagg-idp-iam-ad-inlatest@active_directory'
      );
      expect(hit4.hits.hits).toHaveLength(1);
      expect(hit4.hits.hits[0]._source).toMatchObject({
        entity: {
          id: 'user:postagg-idp-iam-ad-inlatest@active_directory',
          type: 'Identity',
          name: 'IDP IAM AD InLatest',
          namespace: 'active_directory',
          confidence: ENTITY_CONFIDENCE.High,
        },
      });

      // 5. Follow-up doc is not asset/iam (no idpPostAggFilter) and has no host.id (no nonIdpPostAggFilter);
      //    row is kept via entity.id after LOOKUP (prior latest from step 4) → still extracted/updated.
      await forceLogExtraction(apiClient, defaultHeaders, 'user', from, to);
      await ingestDoc(esClient, {
        '@timestamp': '2026-03-01T10:06:00Z',
        event: { kind: 'not-asset-or-iam', module: 'entityanalytics_ad' },
        user: {
          id: 'postagg-idp-iam-ad-inlatest',
          name: 'IDP IAM AD InLatest Updated',
        },
      });
      const ext5 = await forceLogExtraction(apiClient, defaultHeaders, 'user', from, to);
      expect(ext5.statusCode).toBe(200);
      const hit5 = await searchDocById(
        esClient,
        'user:postagg-idp-iam-ad-inlatest@active_directory'
      );
      expect(hit5.hits.hits).toHaveLength(1);
      expect(hit5.hits.hits[0]._source).toMatchObject({
        entity: {
          id: 'user:postagg-idp-iam-ad-inlatest@active_directory',
          type: 'Identity',
          name: 'IDP IAM AD InLatest',
          namespace: 'active_directory',
          confidence: ENTITY_CONFIDENCE.High,
        },
      });
    }
  );

  apiTest(
    'Should only enrich (update) existing entities when entity already exists for both IDP and non-IDP, no new entity creation',
    async ({ apiClient, esClient }) => {
      const from = '2026-03-02T10:00:00Z';
      const to = '2026-03-02T12:00:00Z';

      // 1. Create IDP entity
      await ingestDoc(esClient, {
        '@timestamp': '2026-03-02T10:01:00Z',
        event: { kind: 'asset', module: 'okta' },
        user: { id: 'enrich-idp-user', name: 'Enrich IDP' },
      });
      const ext1 = await forceLogExtraction(apiClient, defaultHeaders, 'user', from, to);
      expect(ext1.statusCode).toBe(200);
      expect(ext1.body).toMatchObject({ count: 1 });

      // 2. Create non-IDP (local) entity
      await ingestDoc(esClient, {
        '@timestamp': '2026-03-02T10:02:00Z',
        event: { kind: 'event', category: 'network', outcome: 'success' },
        user: { name: 'enrich-local-user' },
        host: { id: 'enrich-host-1', name: 'enrich-ws' },
      });
      const ext2 = await forceLogExtraction(apiClient, defaultHeaders, 'user', from, to);
      expect(ext2.statusCode).toBe(200);
      expect(ext2.body).toMatchObject({ count: 2 });

      // 3. Ingest enrichment docs only (entity already exists - same entity, new data)
      // IDP enrichment: same user, updated name
      await ingestDoc(esClient, {
        '@timestamp': '2026-03-02T10:03:00Z',
        event: { kind: 'asset', module: 'okta' },
        user: {
          id: 'enrich-idp-user',
          name: 'Enrich IDP Updated',
          domain: 'enrichment.com',
        },
      });
      // Non-IDP enrichment: same user+host, updated name
      await ingestDoc(esClient, {
        '@timestamp': '2026-03-02T10:04:00Z',
        event: { kind: 'event', category: 'network', outcome: 'success' },
        user: { name: 'enrich-local-user' },
        host: { id: 'enrich-host-1', name: 'enrich-ws-updated' },
      });

      // 4. Run extraction - should only enrich (update) existing entities, no new creation
      const ext3 = await forceLogExtraction(apiClient, defaultHeaders, 'user', from, to);
      expect(ext3.statusCode).toBe(200);
      expect(ext3.body).toMatchObject({ count: 2 });

      // 5. Verify: no new entities, only enrichment (updates) to existing
      const idpHit = await searchDocById(esClient, 'user:enrich-idp-user@okta');
      expect(idpHit.hits.hits).toHaveLength(1);
      expect(idpHit.hits.hits[0]._source).toMatchObject({
        entity: {
          id: 'user:enrich-idp-user@okta',
          type: 'Identity',
          name: 'Enrich IDP Updated',
          namespace: 'okta',
          confidence: ENTITY_CONFIDENCE.High,
        },
        user: { domain: 'enrichment.com' },
      });

      const localHit = await searchDocById(esClient, 'user:enrich-local-user@enrich-host-1@local');
      expect(localHit.hits.hits).toHaveLength(1);
      expect(localHit.hits.hits[0]._source).toMatchObject({
        entity: {
          id: 'user:enrich-local-user@enrich-host-1@local',
          type: 'Identity',
          name: 'enrich-local-user@enrich-ws-updated',
          namespace: USER_ENTITY_NAMESPACE.Local,
          confidence: ENTITY_CONFIDENCE.Medium,
        },
      });
    }
  );

  apiTest(
    'Should set entity.namespace to local and entity.name to user.name@host.name for non-IDP documents',
    async ({ apiClient, esClient }) => {
      // Non-IDP: user.name + host.id present, user.name not in excluded list.
      // Event must NOT be asset/iam so whenConditionTrueSetFieldsPreAgg sets entity.namespace = 'local'.
      await ingestDoc(esClient, {
        '@timestamp': '2026-03-18T10:00:00Z',
        event: { kind: 'event', category: 'network', outcome: 'success' },
        user: { name: 'local-user' },
        host: { id: 'local-host-1', name: 'workstation-42' },
      });

      const extractionResponse = await forceLogExtraction(
        apiClient,
        defaultHeaders,
        'user',
        '2026-03-18T09:59:00Z',
        '2026-03-18T10:01:00Z'
      );
      expect(extractionResponse.statusCode).toBe(200);
      expect(extractionResponse.body).toMatchObject({ count: 1 });

      const hit = await searchDocById(esClient, 'user:local-user@local-host-1@local');
      expect(hit.hits.hits).toHaveLength(1);
      expect(hit.hits.hits[0]._source).toMatchObject({
        entity: {
          id: 'user:local-user@local-host-1@local',
          type: 'Identity',
          name: 'local-user@workstation-42',
          namespace: USER_ENTITY_NAMESPACE.Local,
          confidence: ENTITY_CONFIDENCE.Medium,
        },
      });
    }
  );

  apiTest(
    'Should set entity.name to user.name when non-IDP local document has no host.name',
    async ({ apiClient, esClient }) => {
      await ingestDoc(esClient, {
        '@timestamp': '2026-03-18T11:00:00Z',
        event: { kind: 'event', category: 'network', outcome: 'success' },
        user: { name: 'local-user-no-hostname' },
        host: { id: 'local-host-no-name-1' },
      });

      const extractionResponse = await forceLogExtraction(
        apiClient,
        defaultHeaders,
        'user',
        '2026-03-18T10:59:00Z',
        '2026-03-18T11:01:00Z'
      );
      expect(extractionResponse.statusCode).toBe(200);
      expect(extractionResponse.body).toMatchObject({ count: 1 });

      const hit = await searchDocById(
        esClient,
        'user:local-user-no-hostname@local-host-no-name-1@local'
      );
      expect(hit.hits.hits).toHaveLength(1);
      expect(hit.hits.hits[0]._source).toMatchObject({
        entity: {
          id: 'user:local-user-no-hostname@local-host-no-name-1@local',
          type: 'Identity',
          name: 'local-user-no-hostname',
          namespace: USER_ENTITY_NAMESPACE.Local,
          confidence: ENTITY_CONFIDENCE.Medium,
        },
      });
    }
  );

  apiTest(
    'Should process extraction successfully when ingesting IDP, non-IDP, and invalid user documents',
    async ({ apiClient, esClient }) => {
      const from = '2026-03-18T14:00:00Z';
      const to = '2026-03-18T15:00:00Z';

      // IDP document (asset kind) → extracted
      await ingestDoc(esClient, {
        '@timestamp': '2026-03-18T14:01:00Z',
        event: { kind: 'asset', module: 'okta' },
        user: { id: 'mixed-idp-user', name: 'IDP User' },
      });

      // Non-IDP document (local: user.name + host.id, event.kind=event) → extracted
      await ingestDoc(esClient, {
        '@timestamp': '2026-03-18T14:02:00Z',
        event: { kind: 'event', category: 'network', outcome: 'success' },
        user: { name: 'mixed-local-user' },
        host: { id: 'mixed-host-1', name: 'workstation-99' },
      });

      // Invalid documents (omitted but should not cause extraction to fail)
      await ingestDoc(esClient, {
        '@timestamp': '2026-03-18T14:03:00Z',
        event: { kind: 'asset', module: 'okta', outcome: 'failure' },
        user: { id: 'mixed-invalid-failure', name: 'Failure' },
      });
      await ingestDoc(esClient, {
        '@timestamp': '2026-03-18T14:04:00Z',
        event: { kind: 'asset', module: 'okta' },
        host: { id: 'mixed-no-user-host', name: 'server' },
      });
      await ingestDoc(esClient, {
        '@timestamp': '2026-03-18T14:05:00Z',
        event: { kind: 'event', category: 'network', outcome: 'success' },
        user: { name: 'root' },
        host: { id: 'mixed-root-host', name: 'server' },
      });

      const extractionResponse = await apiClient.post(
        ENTITY_STORE_ROUTES.FORCE_LOG_EXTRACTION('user'),
        {
          headers: defaultHeaders,
          responseType: 'json',
          body: { fromDateISO: from, toDateISO: to },
        }
      );

      expect(extractionResponse.statusCode).toBe(200);
      expect(extractionResponse.body).toMatchObject({ success: true });
      expect(typeof extractionResponse.body.count).toBe('number');
      expect(typeof extractionResponse.body.pages).toBe('number');

      // IDP and non-IDP documents were extracted
      const idpHit = await searchDocById(esClient, 'user:mixed-idp-user@okta');
      expect(idpHit.hits.hits).toHaveLength(1);
      expect(idpHit.hits.hits[0]._source).toMatchObject({
        entity: {
          id: 'user:mixed-idp-user@okta',
          type: 'Identity',
          name: 'IDP User',
          namespace: 'okta',
          confidence: ENTITY_CONFIDENCE.High,
        },
      });

      const localHit = await searchDocById(esClient, 'user:mixed-local-user@mixed-host-1@local');
      expect(localHit.hits.hits).toHaveLength(1);
      expect(localHit.hits.hits[0]._source).toMatchObject({
        entity: {
          id: 'user:mixed-local-user@mixed-host-1@local',
          type: 'Identity',
          name: 'mixed-local-user@workstation-99',
          namespace: USER_ENTITY_NAMESPACE.Local,
          confidence: ENTITY_CONFIDENCE.Medium,
        },
      });

      // Invalid documents were omitted
      expect(
        (await searchDocById(esClient, 'user:mixed-invalid-failure@okta')).hits.hits
      ).toHaveLength(0);
      expect(
        (await searchDocById(esClient, 'user:root@mixed-root-host@local')).hits.hits
      ).toHaveLength(0);
    }
  );

  apiTest(
    'Should not extract user entities for excluded user names (LOCAL_NAMESPACE_EXCLUDED_USER_NAMES in user_entity_constants)',
    async ({ apiClient, esClient }) => {
      const from = '2026-03-18T20:00:00Z';
      const to = '2026-03-18T21:00:00Z';

      // Excluded user names per user.ts: root, bin, daemon, sys, nobody, jenkins, ansible, deploy,
      // terraform, gitlab-runner, postgres, mysql, redis, elasticsearch, kafka, admin, operator, service.
      // Non-IDP docs only (user.name + host.id, no event.kind=asset, no event.category=iam).
      const excludedNames = ['root', 'jenkins', 'ansible', 'postgres', 'admin', 'service'];
      for (let i = 0; i < excludedNames.length; i++) {
        const name = excludedNames[i];
        await ingestDoc(esClient, {
          '@timestamp': `2026-03-18T20:0${i + 1}:00Z`,
          event: { kind: 'event', category: 'network', outcome: 'success' },
          user: { name },
          host: { id: `excluded-host-${name}`, name: 'server' },
        });
      }

      // Valid non-IDP user for comparison
      await ingestDoc(esClient, {
        '@timestamp': '2026-03-18T20:10:00Z',
        event: { kind: 'event', category: 'network', outcome: 'success' },
        user: { name: 'allowed.user' },
        host: { id: 'excluded-host-allowed', name: 'workstation' },
      });

      const extractionResponse = await apiClient.post(
        ENTITY_STORE_ROUTES.FORCE_LOG_EXTRACTION('user'),
        {
          headers: defaultHeaders,
          responseType: 'json',
          body: { fromDateISO: from, toDateISO: to },
        }
      );

      expect(extractionResponse.statusCode).toBe(200);
      expect(extractionResponse.body).toMatchObject({ success: true });

      // Excluded user names must NOT be extracted (no entity for root@..., jenkins@..., etc.)
      for (const name of excludedNames) {
        const entityId = `user:${name}@excluded-host-${name}@local`;
        const hit = await searchDocById(esClient, entityId);
        expect(hit.hits.hits).toHaveLength(0);
      }

      // Valid non-IDP user must be extracted
      const allowedHit = await searchDocById(
        esClient,
        'user:allowed.user@excluded-host-allowed@local'
      );
      expect(allowedHit.hits.hits).toHaveLength(1);
      expect(allowedHit.hits.hits[0]._source).toMatchObject({
        entity: {
          id: 'user:allowed.user@excluded-host-allowed@local',
          type: 'Identity',
          name: 'allowed.user@workstation',
          namespace: USER_ENTITY_NAMESPACE.Local,
          confidence: ENTITY_CONFIDENCE.Medium,
        },
      });
    }
  );

  apiTest(
    'Should process extraction successfully for all entity types with mixed valid and invalid documents',
    async ({ apiClient, esClient }) => {
      const from = '2026-03-18T16:00:00Z';
      const to = '2026-03-18T17:00:00Z';

      // Host: valid
      await ingestDoc(esClient, {
        '@timestamp': '2026-03-18T16:01:00Z',
        host: { id: 'mixed-host-valid', name: 'mixed-server-01' },
      });
      // Host: invalid (no host.id, host.name, host.hostname)
      await ingestDoc(esClient, {
        '@timestamp': '2026-03-18T16:02:00Z',
        event: { module: 'system' },
      });

      // User: IDP + non-IDP + invalid (already covered above, use unique IDs)
      await ingestDoc(esClient, {
        '@timestamp': '2026-03-18T16:03:00Z',
        event: { kind: 'asset', module: 'okta' },
        user: { id: 'mixed-all-idp', name: 'AllTypes IDP' },
      });
      await ingestDoc(esClient, {
        '@timestamp': '2026-03-18T16:04:00Z',
        event: { kind: 'event', category: 'network', outcome: 'success' },
        user: { name: 'mixed-all-local' },
        host: { id: 'mixed-all-host', name: 'ws-01' },
      });
      await ingestDoc(esClient, {
        '@timestamp': '2026-03-18T16:05:00Z',
        event: { kind: 'asset', module: 'okta', outcome: 'failure' },
        user: { id: 'mixed-all-invalid', name: 'Invalid' },
      });

      // Service: valid
      await ingestDoc(esClient, {
        '@timestamp': '2026-03-18T16:06:00Z',
        service: { name: 'mixed-service-valid' },
      });

      // Generic: valid
      await ingestDoc(esClient, {
        '@timestamp': '2026-03-18T16:07:00Z',
        entity: { id: 'mixed-generic-valid', name: 'Mixed Generic' },
      });

      for (const entityType of ['host', 'user', 'service', 'generic'] as const) {
        const extractionResponse = await apiClient.post(
          ENTITY_STORE_ROUTES.FORCE_LOG_EXTRACTION(entityType),
          {
            headers: defaultHeaders,
            responseType: 'json',
            body: { fromDateISO: from, toDateISO: to },
          }
        );
        expect(extractionResponse.statusCode).toBe(200);
        expect(extractionResponse.body).toMatchObject({ success: true });
      }

      // Verify extracted entities
      const hostHit = await searchDocById(esClient, 'host:mixed-host-valid');
      expect(hostHit.hits.hits).toHaveLength(1);

      const userIdpHit = await searchDocById(esClient, 'user:mixed-all-idp@okta');
      expect(userIdpHit.hits.hits).toHaveLength(1);
      expect(userIdpHit.hits.hits[0]._source).toMatchObject({
        entity: {
          id: 'user:mixed-all-idp@okta',
          namespace: 'okta',
          confidence: ENTITY_CONFIDENCE.High,
        },
      });

      const userLocalHit = await searchDocById(
        esClient,
        'user:mixed-all-local@mixed-all-host@local'
      );
      expect(userLocalHit.hits.hits).toHaveLength(1);
      expect(userLocalHit.hits.hits[0]._source).toMatchObject({
        entity: {
          id: 'user:mixed-all-local@mixed-all-host@local',
          namespace: USER_ENTITY_NAMESPACE.Local,
          confidence: ENTITY_CONFIDENCE.Medium,
        },
      });

      expect((await searchDocById(esClient, 'user:mixed-all-invalid@okta')).hits.hits).toHaveLength(
        0
      );

      const serviceHit = await searchDocById(esClient, 'service:mixed-service-valid');
      expect(serviceHit.hits.hits).toHaveLength(1);

      const genericHit = await searchDocById(esClient, 'mixed-generic-valid');
      expect(genericHit.hits.hits).toHaveLength(1);
    }
  );

  apiTest(
    'Should omit documents at logs extraction when they do not match documentsFilter or postAggFilter',
    async ({ apiClient, esClient }) => {
      const from = '2026-03-18T11:00:00Z';
      const to = '2026-03-18T12:00:00Z';

      // 1. event.outcome = 'failure' → documentsFilter omits (pre-agg)
      await ingestDoc(esClient, {
        '@timestamp': '2026-03-18T11:01:00Z',
        event: { kind: 'asset', module: 'okta', outcome: 'failure' },
        user: { id: 'omitted-failure', name: 'FailureUser' },
      });

      // 2. No user identity (no user.email, user.id, user.name) → documentsFilter omits
      await ingestDoc(esClient, {
        '@timestamp': '2026-03-18T11:02:00Z',
        event: { kind: 'asset', module: 'okta' },
        host: { id: 'host-omitted', name: 'server' },
      });

      // 3. user.name in excluded list (e.g. 'root') with host.id, event.kind='event' → postAggFilter omits
      await ingestDoc(esClient, {
        '@timestamp': '2026-03-18T11:03:00Z',
        event: { kind: 'event', category: 'network', outcome: 'success' },
        user: { name: 'root' },
        host: { id: 'omitted-root-host', name: 'server-01' },
      });

      // 4. user.name only, plain network event (no host.id) — idpDocumentFilter passes but postAggFilter omits
      //    (not idpPostAgg asset/iam shape, not nonIdpPostAgg without host.id, no entity.id).
      await ingestDoc(esClient, {
        '@timestamp': '2026-03-18T11:04:00Z',
        event: { kind: 'event', category: 'network', outcome: 'success' },
        user: { name: 'no-host-user' },
      });

      const extractionResponse = await forceLogExtraction(
        apiClient,
        defaultHeaders,
        'user',
        from,
        to
      );
      expect(extractionResponse.statusCode).toBe(200);
      expect(extractionResponse.body).toMatchObject({ count: 0 });

      // Verify none of the omitted documents produced entities
      expect((await searchDocById(esClient, 'user:omitted-failure@okta')).hits.hits).toHaveLength(
        0
      );
      expect(
        (await searchDocById(esClient, 'user:root@omitted-root-host@local')).hits.hits
      ).toHaveLength(0);
      expect((await searchDocById(esClient, 'user:no-host-user@unknown')).hits.hits).toHaveLength(
        0
      );
    }
  );

  apiTest(
    'Should store _source as nested objects after ingest pipeline',
    async ({ apiClient, esClient }) => {
      const extractionResponse = await apiClient.post(
        ENTITY_STORE_ROUTES.FORCE_LOG_EXTRACTION('host'),
        {
          headers: defaultHeaders,
          responseType: 'json',
          body: {
            fromDateISO: '2026-01-20T11:00:00Z',
            toDateISO: '2026-01-20T13:00:00Z',
          },
        }
      );
      expect(extractionResponse.statusCode).toBe(200);
      expect(extractionResponse.body.success).toBe(true);

      const entities = await esClient.search({
        index: '.entities.v2.latest.security_default',
        query: { bool: { filter: { term: { 'entity.EngineMetadata.Type': 'host' } } } },
        size: 5,
      });

      expect(entities.hits.hits.length).toBeGreaterThan(0);
      for (const hit of entities.hits.hits) {
        const source = hit._source as Record<string, unknown>;
        expect(source).toBeDefined();
        expect(source.entity).toBeDefined();
        expect(typeof source.entity).toBe('object');
        const topLevelKeys = Object.keys(source);
        const dottedKeys = topLevelKeys.filter((k) => k.includes('.'));
        expect(dottedKeys).toHaveLength(0);
      }
    }
  );
});
