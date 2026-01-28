/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { apiTest, expect } from '@kbn/scout-security';
import { COMMON_HEADERS, ENTITY_STORE_ROUTES, ENTITY_STORE_TAGS } from '../fixtures/constants';
import { FF_ENABLE_ENTITY_STORE_V2 } from '../../../../common';

apiTest.describe('Entity Store API tests', { tag: ENTITY_STORE_TAGS }, () => {
  let defaultHeaders: Record<string, string>;

  apiTest.beforeAll(async ({ samlAuth, apiClient, esArchiver }) => {
    const credentials = await samlAuth.asInteractiveUser('admin');
    defaultHeaders = {
      ...credentials.cookieHeader,
      ...COMMON_HEADERS,
    };

    // enable feature flag
    await apiClient.post('internal/kibana/settings', {
      headers: defaultHeaders,
      responseType: 'json',
      body: {
        changes: {
          [FF_ENABLE_ENTITY_STORE_V2]: true,
        },
      },
    });

    // Install the entity store
    const response = await apiClient.post(ENTITY_STORE_ROUTES.INSTALL, {
      headers: defaultHeaders,
      responseType: 'json',
      body: {},
    });
    expect(response.statusCode).toBe(200);

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

  apiTest('Should extract properly generate euid for host', async ({ apiClient, esClient }) => {
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
    expect(extractionResponse.body.count).toBe(16);

    const entities = await esClient.search({
      index: '.entities.v2.latest.security_host_default',
      size: 1000, // a lot just to be sure we are not capping it
    });

    expect(entities.hits.hits).toHaveLength(16);
    // it's deterministic because of the MD5 id
    // manually checking object until we have a snapshot matcher
    expect(entities.hits.hits).toMatchObject([
      {
        _index: '.entities.v2.latest.security_host_default',
        _id: 'a3872e401531d41f50a187fa61fbfffe',
        _score: 1,
        _source: {
          'entity.EngineMetadata.Type': 'host',
          'host.id': 'host-123',
          'entity.name': 'host:host-123',
          'entity.type': 'Host',
          '@timestamp': '2026-01-20T12:05:00.000Z',
          'entity.id': 'host:host-123',
          'host.entity.id': 'host:host-123',
        },
      },
      {
        _index: '.entities.v2.latest.security_host_default',
        _id: 'c51b57fc40995ed530907fcdf981ced9',
        _score: 1,
        _source: {
          'entity.EngineMetadata.Type': 'host',
          'host.name': 'server-01',
          'host.domain': 'example.com',
          'entity.name': 'host:server-01.example.com',
          'entity.type': 'Host',
          '@timestamp': '2026-01-20T12:05:01.000Z',
          'entity.id': 'host:server-01.example.com',
          'host.entity.id': 'host:server-01.example.com',
        },
      },
      {
        _index: '.entities.v2.latest.security_host_default',
        _id: '1260e35e2450159f1676fedb4b67ce46',
        _score: 1,
        _source: {
          'entity.EngineMetadata.Type': 'host',
          'host.domain': 'corp.local',
          'host.hostname': 'workstation-05',
          'entity.name': 'host:workstation-05.corp.local',
          'entity.type': 'Host',
          '@timestamp': '2026-01-20T12:05:02.000Z',
          'entity.id': 'host:workstation-05.corp.local',
          'host.entity.id': 'host:workstation-05.corp.local',
        },
      },
      {
        _index: '.entities.v2.latest.security_host_default',
        _id: 'b3f4c3355bd6bec40156867ae5ddb158',
        _score: 1,
        _source: {
          'entity.EngineMetadata.Type': 'host',
          'host.hostname': 'laptop-01',
          'entity.name': 'host:laptop-01',
          'entity.type': 'Host',
          '@timestamp': '2026-01-20T12:05:04.000Z',
          'entity.id': 'host:laptop-01',
          'host.entity.id': 'host:laptop-01',
        },
      },
      {
        _index: '.entities.v2.latest.security_host_default',
        _id: '5e72f85ad33f4e4cf981dcff134c050c',
        _score: 1,
        _source: {
          'entity.EngineMetadata.Type': 'host',
          'entity.name': 'host:non-generated-host',
          'entity.type': 'Host',
          '@timestamp': '2026-01-20T12:05:04.000Z',
          'entity.id': 'host:non-generated-host',
          'host.entity.id': 'host:non-generated-host',
        },
      },
      {
        _index: '.entities.v2.latest.security_host_default',
        _id: 'cb20977f0b08562677a022f7362b3e9a',
        _score: 1,
        _source: {
          'entity.EngineMetadata.Type': 'host',
          'host.name': 'desktop-02',
          'entity.name': 'host:desktop-02',
          'entity.type': 'Host',
          '@timestamp': '2026-01-20T12:05:05.000Z',
          'entity.id': 'host:desktop-02',
          'host.entity.id': 'host:desktop-02',
        },
      },
      {
        _index: '.entities.v2.latest.security_host_default',
        _id: '0074d60e067281b4286ec527953c8e7b',
        _score: 1,
        _source: {
          'entity.EngineMetadata.Type': 'host',
          'host.name': 'server-02',
          'host.domain': 'example.com',
          'host.id': 'host-456',
          'entity.name': 'host:host-456',
          'entity.type': 'Host',
          '@timestamp': '2026-01-20T12:05:06.000Z',
          'entity.id': 'host:host-456',
          'host.entity.id': 'host:host-456',
        },
      },
      {
        _index: '.entities.v2.latest.security_host_default',
        _id: '7ce02ea9458bb0c3adccc71ea36acced',
        _score: 1,
        _source: {
          'entity.EngineMetadata.Type': 'host',
          'host.domain': 'corp.local',
          'host.hostname': 'workstation-10',
          'host.id': 'host-789',
          'entity.name': 'host:host-789',
          'entity.type': 'Host',
          '@timestamp': '2026-01-20T12:05:07.000Z',
          'entity.id': 'host:host-789',
          'host.entity.id': 'host:host-789',
        },
      },
      {
        _index: '.entities.v2.latest.security_host_default',
        _id: '180b7320d4ce161699c962c956c9bb46',
        _score: 1,
        _source: {
          'entity.EngineMetadata.Type': 'host',
          'host.name': 'server-03',
          'host.domain': 'test.com',
          'host.hostname': 'backup-server',
          'entity.name': 'host:server-03.test.com',
          'entity.type': 'Host',
          '@timestamp': '2026-01-20T12:05:08.000Z',
          'entity.id': 'host:server-03.test.com',
          'host.entity.id': 'host:server-03.test.com',
        },
      },
      {
        _index: '.entities.v2.latest.security_host_default',
        _id: '8b261663c77543e6a4544fc85cdc62ef',
        _score: 1,
        _source: {
          'entity.EngineMetadata.Type': 'host',
          'host.name': 'server-04',
          'host.domain': 'example.org',
          'host.id': '',
          'entity.name': 'host:server-04.example.org',
          'entity.type': 'Host',
          '@timestamp': '2026-01-20T12:05:09.000Z',
          'entity.id': 'host:server-04.example.org',
          'host.entity.id': 'host:server-04.example.org',
        },
      },
      {
        _index: '.entities.v2.latest.security_host_default',
        _id: 'b4e5db4fb8eb7f13d284ee386210b26e',
        _score: 1,
        _source: {
          'entity.EngineMetadata.Type': 'host',
          'host.name': 'server-05',
          'host.domain': 'test.net',
          'entity.name': 'host:server-05.test.net',
          'entity.type': 'Host',
          '@timestamp': '2026-01-20T12:05:10.000Z',
          'entity.id': 'host:server-05.test.net',
          'host.entity.id': 'host:server-05.test.net',
        },
      },
      {
        _index: '.entities.v2.latest.security_host_default',
        _id: '40b5875887d5e812570327b9604425a6',
        _score: 1,
        _source: {
          'entity.EngineMetadata.Type': 'host',
          'host.domain': 'corp.local',
          'host.hostname': 'workstation-20',
          'entity.name': 'host:workstation-20.corp.local',
          'entity.type': 'Host',
          '@timestamp': '2026-01-20T12:05:12.000Z',
          'entity.id': 'host:workstation-20.corp.local',
          'host.entity.id': 'host:workstation-20.corp.local',
        },
      },
      {
        _index: '.entities.v2.latest.security_host_default',
        _id: 'a5d3d8b58538b9ee1ca73b50d15d4b52',
        _score: 1,
        _source: {
          'entity.EngineMetadata.Type': 'host',
          'host.name': 'server-06',
          'host.domain': '',
          'entity.name': 'host:server-06',
          'entity.type': 'Host',
          '@timestamp': '2026-01-20T12:05:13.000Z',
          'entity.id': 'host:server-06',
          'host.entity.id': 'host:server-06',
        },
      },
      {
        _index: '.entities.v2.latest.security_host_default',
        _id: '68c7ffbdcf9404e4494ac43a83719ef5',
        _score: 1,
        _source: {
          'entity.EngineMetadata.Type': 'host',
          'host.name': 'server-07',
          'entity.name': 'host:server-07',
          'entity.type': 'Host',
          '@timestamp': '2026-01-20T12:05:14.000Z',
          'entity.id': 'host:server-07',
          'host.entity.id': 'host:server-07',
        },
      },
      {
        _index: '.entities.v2.latest.security_host_default',
        _id: 'f69c44458b36688926b09ed388c8b5be',
        _score: 1,
        _source: {
          'entity.EngineMetadata.Type': 'host',
          'host.name': 'server-08',
          'host.domain': 'corp.local',
          'host.hostname': 'laptop-02',
          'entity.name': 'host:server-08.corp.local',
          'entity.type': 'Host',
          '@timestamp': '2026-01-20T12:05:17.000Z',
          'entity.id': 'host:server-08.corp.local',
          'host.entity.id': 'host:server-08.corp.local',
        },
      },
      {
        _index: '.entities.v2.latest.security_host_default',
        _id: '1fba7560b67c8b51827bac3b6c86fce1',
        _score: 1,
        _source: {
          'entity.EngineMetadata.Type': 'host',
          'host.hostname': 'workstation-30',
          'entity.name': 'host:workstation-30',
          'entity.type': 'Host',
          '@timestamp': '2026-01-20T12:05:18.000Z',
          'entity.id': 'host:workstation-30',
          'host.entity.id': 'host:workstation-30',
        },
      },
    ]);
  });

  apiTest('Should extract properly generate euid for user', async ({ apiClient, esClient }) => {
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
    expect(extractionResponse.body.count).toBe(20);

    const entities = await esClient.search({
      index: '.entities.v2.latest.security_user_default',
      size: 1000, // a lot just to be sure we are not capping it
    });

    expect(entities.hits.hits).toHaveLength(20);
    // it's deterministic because of the MD5 id
    // manually checking object until we have a snapshot matcher
    expect(entities.hits.hits).toMatchObject([
      {
        _index: '.entities.v2.latest.security_user_default',
        _id: '1d9cb6c21dfa9156571de1281d707719',
        _score: 1,
        _source: {
          'entity.EngineMetadata.Type': 'user',
          'user.name': 'john.doe',
          'entity.name': 'user:john.doe@host-123',
          'entity.type': 'Identity',
          'host.entity.id': 'host-123',
          '@timestamp': '2026-01-20T12:05:00.000Z',
          'entity.id': 'user:john.doe@host-123',
          'user.entity.id': 'user:john.doe@host-123',
        },
      },
      {
        _index: '.entities.v2.latest.security_user_default',
        _id: '34e67fc3f53984dbfd0ed097197cc453',
        _score: 1,
        _source: {
          'entity.EngineMetadata.Type': 'user',
          'user.name': 'jane.smith',
          'entity.name': 'user:jane.smith@host-456',
          'entity.type': 'Identity',
          'host.id': 'host-456',
          '@timestamp': '2026-01-20T12:05:01.000Z',
          'entity.id': 'user:jane.smith@host-456',
          'user.entity.id': 'user:jane.smith@host-456',
        },
      },
      {
        _index: '.entities.v2.latest.security_user_default',
        _id: 'ba6d49220ff970733fff891e87d09e56',
        _score: 1,
        _source: {
          'entity.EngineMetadata.Type': 'user',
          'user.name': 'bob.jones',
          'entity.name': 'user:bob.jones@server-01',
          'entity.type': 'Identity',
          'host.name': 'server-01',
          '@timestamp': '2026-01-20T12:05:02.000Z',
          'entity.id': 'user:bob.jones@server-01',
          'user.entity.id': 'user:bob.jones@server-01',
        },
      },
      {
        _index: '.entities.v2.latest.security_user_default',
        _id: 'd0ddd45157d6fe1cbde790dea38d8817',
        _score: 1,
        _source: {
          'entity.EngineMetadata.Type': 'user',
          'user.name': 'alice.brown',
          'user.id': 'user-789',
          'entity.name': 'user:user-789',
          'entity.type': 'Identity',
          '@timestamp': '2026-01-20T12:05:03.000Z',
          'entity.id': 'user:user-789',
          'user.entity.id': 'user:user-789',
        },
      },
      {
        _index: '.entities.v2.latest.security_user_default',
        _id: 'bd55eef67b506ab8735e6f0f59e8bee8',
        _score: 1,
        _source: {
          'entity.EngineMetadata.Type': 'user',
          'user.id': 'user-101',
          'entity.name': 'user:user-101',
          'entity.type': 'Identity',
          '@timestamp': '2026-01-20T12:05:04.000Z',
          'entity.id': 'user:user-101',
          'user.entity.id': 'user:user-101',
        },
      },
      {
        _index: '.entities.v2.latest.security_user_default',
        _id: '025d1e3fbf1982fba259d37978ee5709',
        _score: 1,
        _source: {
          'entity.EngineMetadata.Type': 'user',
          'entity.name': 'user:non-generated-user',
          'entity.type': 'Identity',
          '@timestamp': '2026-01-20T12:05:04.000Z',
          'entity.id': 'user:non-generated-user',
          'user.entity.id': 'user:non-generated-user',
        },
      },
      {
        _index: '.entities.v2.latest.security_user_default',
        _id: '6f42b467570b3e7ab0d0ae8b60965648',
        _score: 1,
        _source: {
          'entity.EngineMetadata.Type': 'user',
          'user.email': 'test@example.com',
          'entity.name': 'user:test@example.com',
          'entity.type': 'Identity',
          '@timestamp': '2026-01-20T12:05:05.000Z',
          'entity.id': 'user:test@example.com',
          'user.entity.id': 'user:test@example.com',
        },
      },
      {
        _index: '.entities.v2.latest.security_user_default',
        _id: 'e7f943e1388a4bb2e06e96821fe7cc13',
        _score: 1,
        _source: {
          'entity.EngineMetadata.Type': 'user',
          'user.domain': 'corp',
          'user.name': 'charlie.wilson',
          'entity.name': 'user:charlie.wilson.corp',
          'entity.type': 'Identity',
          '@timestamp': '2026-01-20T12:05:06.000Z',
          'entity.id': 'user:charlie.wilson.corp',
          'user.entity.id': 'user:charlie.wilson.corp',
        },
      },
      {
        _index: '.entities.v2.latest.security_user_default',
        _id: 'a870b6e8cd872aeb6696cc70997484fd',
        _score: 1,
        _source: {
          'entity.EngineMetadata.Type': 'user',
          'user.name': 'david.lee',
          'entity.name': 'user:david.lee',
          'entity.type': 'Identity',
          '@timestamp': '2026-01-20T12:05:07.000Z',
          'entity.id': 'user:david.lee',
          'user.entity.id': 'user:david.lee',
        },
      },
      {
        _index: '.entities.v2.latest.security_user_default',
        _id: 'c049dff0ed865eb3709c2577344652df',
        _score: 1,
        _source: {
          'entity.EngineMetadata.Type': 'user',
          'user.name': '',
          'user.id': 'user-202',
          'entity.name': 'user:user-202',
          'entity.type': 'Identity',
          '@timestamp': '2026-01-20T12:05:08.000Z',
          'entity.id': 'user:user-202',
          'user.entity.id': 'user:user-202',
        },
      },
      {
        _index: '.entities.v2.latest.security_user_default',
        _id: '7b71429fa06bece73a69aa3b6c111933',
        _score: 1,
        _source: {
          'entity.EngineMetadata.Type': 'user',
          'user.id': 'user-303',
          'entity.name': 'user:user-303',
          'entity.type': 'Identity',
          '@timestamp': '2026-01-20T12:05:09.000Z',
          'entity.id': 'user:user-303',
          'user.entity.id': 'user:user-303',
        },
      },
      {
        _index: '.entities.v2.latest.security_user_default',
        _id: 'a71d3785ad04601f4b98990e871cd82b',
        _score: 1,
        _source: {
          'entity.EngineMetadata.Type': 'user',
          'user.name': 'eve.martin',
          'entity.name': 'user:eve.martin@host-404',
          'entity.type': 'Identity',
          'host.entity.id': '',
          'host.id': 'host-404',
          '@timestamp': '2026-01-20T12:05:10.000Z',
          'entity.id': 'user:eve.martin@host-404',
          'user.entity.id': 'user:eve.martin@host-404',
        },
      },
      {
        _index: '.entities.v2.latest.security_user_default',
        _id: 'd4ccc5552730aec959408caca3473ee7',
        _score: 1,
        _source: {
          'entity.EngineMetadata.Type': 'user',
          'user.name': 'frank.taylor',
          'entity.name': 'user:frank.taylor@workstation-05',
          'entity.type': 'Identity',
          'host.id': '',
          'host.name': 'workstation-05',
          '@timestamp': '2026-01-20T12:05:11.000Z',
          'entity.id': 'user:frank.taylor@workstation-05',
          'user.entity.id': 'user:frank.taylor@workstation-05',
        },
      },
      {
        _index: '.entities.v2.latest.security_user_default',
        _id: '9c2027667a9851d44876ae4e4008b108',
        _score: 1,
        _source: {
          'entity.EngineMetadata.Type': 'user',
          'user.email': 'grace@example.com',
          'user.name': 'grace.anderson',
          'entity.name': 'user:grace@example.com',
          'entity.type': 'Identity',
          '@timestamp': '2026-01-20T12:05:12.000Z',
          'entity.id': 'user:grace@example.com',
          'user.entity.id': 'user:grace@example.com',
        },
      },
      {
        _index: '.entities.v2.latest.security_user_default',
        _id: 'fcaaebb1c3ef5431de17f325a54bf97f',
        _score: 1,
        _source: {
          'entity.EngineMetadata.Type': 'user',
          'user.name': 'henry.clark',
          'entity.name': 'user:henry.clark',
          'entity.type': 'Identity',
          '@timestamp': '2026-01-20T12:05:13.000Z',
          'entity.id': 'user:henry.clark',
          'user.entity.id': 'user:henry.clark',
        },
      },
      {
        _index: '.entities.v2.latest.security_user_default',
        _id: '8b8b96fb0537d319e1397a175681a6b6',
        _score: 1,
        _source: {
          'entity.EngineMetadata.Type': 'user',
          'user.domain': '',
          'user.name': 'iris.davis',
          'entity.name': 'user:iris.davis',
          'entity.type': 'Identity',
          '@timestamp': '2026-01-20T12:05:14.000Z',
          'entity.id': 'user:iris.davis',
          'user.entity.id': 'user:iris.davis',
        },
      },
      {
        _index: '.entities.v2.latest.security_user_default',
        _id: '4b11dd6cf7a4b049ce8afd5f38064094',
        _score: 1,
        _source: {
          'entity.EngineMetadata.Type': 'user',
          'user.name': 'jack.white',
          'entity.name': 'user:jack.white',
          'entity.type': 'Identity',
          '@timestamp': '2026-01-20T12:05:15.000Z',
          'entity.id': 'user:jack.white',
          'user.entity.id': 'user:jack.white',
        },
      },
      {
        _index: '.entities.v2.latest.security_user_default',
        _id: '9211621cb08e16e69dc48158e35579c8',
        _score: 1,
        _source: {
          'entity.EngineMetadata.Type': 'user',
          'user.name': 'karen.green',
          'user.id': 'user-505',
          'entity.name': 'user:karen.green@host-505',
          'entity.type': 'Identity',
          'host.entity.id': 'host-505',
          '@timestamp': '2026-01-20T12:05:16.000Z',
          'entity.id': 'user:karen.green@host-505',
          'user.entity.id': 'user:karen.green@host-505',
        },
      },
      {
        _index: '.entities.v2.latest.security_user_default',
        _id: '5a3d5fc12af596c35c9bcce0ec15e297',
        _score: 1,
        _source: {
          'entity.EngineMetadata.Type': 'user',
          'user.email': 'larry@example.com',
          'user.name': 'larry.black',
          'entity.name': 'user:larry.black@host-606',
          'entity.type': 'Identity',
          'host.id': 'host-606',
          '@timestamp': '2026-01-20T12:05:17.000Z',
          'entity.id': 'user:larry.black@host-606',
          'user.entity.id': 'user:larry.black@host-606',
        },
      },
      {
        _index: '.entities.v2.latest.security_user_default',
        _id: '855f0e0353f2a443af0c6baea478a6d8',
        _score: 1,
        _source: {
          'entity.EngineMetadata.Type': 'user',
          'user.domain': 'corp',
          'user.name': 'mary.blue',
          'entity.name': 'user:mary.blue@server-07',
          'entity.type': 'Identity',
          'host.name': 'server-07',
          '@timestamp': '2026-01-20T12:05:18.000Z',
          'entity.id': 'user:mary.blue@server-07',
          'user.entity.id': 'user:mary.blue@server-07',
        },
      },
    ]);
  });

  apiTest('Should extract properly generate euid for service', async ({ apiClient, esClient }) => {
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
    expect(extractionResponse.body.count).toBe(2);

    const entities = await esClient.search({
      index: '.entities.v2.latest.security_service_default',
      size: 1000, // a lot just to be sure we are not capping it
    });

    expect(entities.hits.hits).toHaveLength(2);
    // it's deterministic because of the MD5 id
    // manually checking object until we have a snapshot matcher
    expect(entities.hits.hits).toMatchObject([
      {
        _index: '.entities.v2.latest.security_service_default',
        _id: '15b621f577206d843980a40d38554c70',
        _score: 1,
        _source: {
          'entity.EngineMetadata.Type': 'service',
          'entity.name': 'service:non-generated-service-id',
          'entity.type': 'Service',
          '@timestamp': '2026-01-20T12:05:04.000Z',
          'entity.id': 'service:non-generated-service-id',
          'service.entity.id': 'service:non-generated-service-id',
        },
      },
      {
        _index: '.entities.v2.latest.security_service_default',
        _id: '0f9d5fcd02e63ca500ca9515f76ce174',
        _score: 1,
        _source: {
          'entity.EngineMetadata.Type': 'service',
          'entity.name': 'service:service-name',
          'entity.type': 'Service',
          '@timestamp': '2026-01-20T12:05:05.000Z',
          'entity.id': 'service:service-name',
          'service.entity.id': 'service:service-name',
        },
      },
    ]);
  });

  apiTest('Should extract properly generate euid for generic', async ({ apiClient, esClient }) => {
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
    expect(extractionResponse.body.count).toBe(1);

    const entities = await esClient.search({
      index: '.entities.v2.latest.security_generic_default',
      size: 1000, // a lot just to be sure we are not capping it
    });

    expect(entities.hits.hits).toHaveLength(1);
    // it's deterministic because of the MD5 id
    // manually checking object until we have a snapshot matcher
    expect(entities.hits.hits).toMatchObject([
      {
        _index: '.entities.v2.latest.security_generic_default',
        _id: '9e606449c558b5253d8b1f028fe7dca0',
        _score: 1,
        _source: {
          'entity.EngineMetadata.Type': 'generic',
          'entity.name': 'generic:generic-id',
          '@timestamp': '2026-01-20T12:05:05.000Z',
          'entity.id': 'generic:generic-id',
        },
      },
    ]);
  });
});
