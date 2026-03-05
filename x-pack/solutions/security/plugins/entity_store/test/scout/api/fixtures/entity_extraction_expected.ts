/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export const expectedHostEntities = [
  {
    _index: '.entities.v2.latest.security_default',
    _id: 'a3872e401531d41f50a187fa61fbfffe',
    _source: {
      '@timestamp': '2026-01-20T12:05:00.000Z',
      host: { id: 'host-123' },
      entity: {
        name: 'host-123',
        type: 'Host',
        id: 'host:host-123',
        EngineMetadata: { Type: 'host', UntypedId: 'host-123' },
      },
    },
  },
  {
    _index: '.entities.v2.latest.security_default',
    _id: 'c51b57fc40995ed530907fcdf981ced9',
    _source: {
      '@timestamp': '2026-01-20T12:05:01.000Z',
      host: { name: 'server-01', domain: 'example.com' },
      entity: {
        name: 'server-01',
        type: 'Host',
        id: 'host:server-01.example.com',
        EngineMetadata: { Type: 'host', UntypedId: 'server-01.example.com' },
      },
    },
  },
  {
    _index: '.entities.v2.latest.security_default',
    _id: '17acdbddb5f80cc777f3101c120b66a6',
    _source: {
      '@timestamp': '2026-01-20T12:05:02.000Z',
      host: { entity: { id: 'host-with-entity-id' }, name: 'server-01', domain: 'example.com' },
      entity: {
        name: 'server-01',
        type: 'Host',
        id: 'host:host-with-entity-id',
        EngineMetadata: { Type: 'host', UntypedId: 'host-with-entity-id' },
      },
    },
  },
  {
    _index: '.entities.v2.latest.security_default',
    _id: 'd5b2488f87685ca7ef426aad7ccc777e',
    _source: {
      '@timestamp': '2026-01-20T12:05:02.000Z',
      host: { name: 'server-01' },
      entity: {
        name: 'server-01',
        type: 'Host',
        id: 'host:server-01',
        EngineMetadata: { Type: 'host', UntypedId: 'server-01' },
      },
    },
  },
  {
    _index: '.entities.v2.latest.security_default',
    _id: '1260e35e2450159f1676fedb4b67ce46',
    _source: {
      '@timestamp': '2026-01-20T12:05:02.000Z',
      host: { domain: 'corp.local', hostname: 'workstation-05' },
      entity: {
        name: 'workstation-05.corp.local',
        type: 'Host',
        id: 'host:workstation-05.corp.local',
        EngineMetadata: { Type: 'host', UntypedId: 'workstation-05.corp.local' },
      },
    },
  },
  {
    _index: '.entities.v2.latest.security_default',
    _id: 'b3f4c3355bd6bec40156867ae5ddb158',
    _source: {
      '@timestamp': '2026-01-20T12:05:04.000Z',
      host: { hostname: 'laptop-01' },
      entity: {
        name: 'laptop-01',
        type: 'Host',
        id: 'host:laptop-01',
        EngineMetadata: { Type: 'host', UntypedId: 'laptop-01' },
      },
    },
  },
  {
    _index: '.entities.v2.latest.security_default',
    _id: '5e72f85ad33f4e4cf981dcff134c050c',
    _source: {
      '@timestamp': '2026-01-20T12:05:04.000Z',
      host: { entity: { id: 'non-generated-host' } },
      entity: {
        name: 'non-generated-host',
        type: 'Host',
        id: 'host:non-generated-host',
        EngineMetadata: { Type: 'host', UntypedId: 'non-generated-host' },
      },
    },
  },
  {
    _index: '.entities.v2.latest.security_default',
    _id: 'cb20977f0b08562677a022f7362b3e9a',
    _source: {
      '@timestamp': '2026-01-20T12:05:05.000Z',
      host: { name: 'desktop-02' },
      entity: {
        name: 'desktop-02',
        type: 'Host',
        id: 'host:desktop-02',
        EngineMetadata: { Type: 'host', UntypedId: 'desktop-02' },
      },
    },
  },
  {
    _index: '.entities.v2.latest.security_default',
    _id: '0074d60e067281b4286ec527953c8e7b',
    _source: {
      '@timestamp': '2026-01-20T12:05:06.000Z',
      host: { name: 'server-02', domain: 'example.com', id: 'host-456' },
      entity: {
        name: 'server-02',
        type: 'Host',
        id: 'host:host-456',
        EngineMetadata: { Type: 'host', UntypedId: 'host-456' },
      },
    },
  },
  {
    _index: '.entities.v2.latest.security_default',
    _id: '7ce02ea9458bb0c3adccc71ea36acced',
    _source: {
      '@timestamp': '2026-01-20T12:05:07.000Z',
      host: { domain: 'corp.local', hostname: 'workstation-10', id: 'host-789' },
      entity: {
        name: 'host-789',
        type: 'Host',
        id: 'host:host-789',
        EngineMetadata: { Type: 'host', UntypedId: 'host-789' },
      },
    },
  },
  {
    _index: '.entities.v2.latest.security_default',
    _id: '180b7320d4ce161699c962c956c9bb46',
    _source: {
      '@timestamp': '2026-01-20T12:05:08.000Z',
      host: { name: 'server-03', domain: 'test.com', hostname: 'backup-server' },
      entity: {
        name: 'server-03',
        type: 'Host',
        id: 'host:server-03.test.com',
        EngineMetadata: { Type: 'host', UntypedId: 'server-03.test.com' },
      },
    },
  },
  {
    _index: '.entities.v2.latest.security_default',
    _id: '8b261663c77543e6a4544fc85cdc62ef',
    _source: {
      '@timestamp': '2026-01-20T12:05:09.000Z',
      host: { name: 'server-04', domain: 'example.org', id: '' },
      entity: {
        name: 'server-04',
        type: 'Host',
        id: 'host:server-04.example.org',
        EngineMetadata: { Type: 'host', UntypedId: 'server-04.example.org' },
      },
    },
  },
  {
    _index: '.entities.v2.latest.security_default',
    _id: '9fff579a1f2d32a2c470ed711de1e04b',
    _source: {
      '@timestamp': '2026-01-20T12:05:10.000Z',
      host: { entity: { id: '' }, id: 'host-404' },
      entity: {
        name: 'host-404',
        type: 'Host',
        id: 'host:host-404',
        EngineMetadata: { Type: 'host', UntypedId: 'host-404' },
      },
    },
  },
  {
    _index: '.entities.v2.latest.security_default',
    _id: 'b4e5db4fb8eb7f13d284ee386210b26e',
    _source: {
      '@timestamp': '2026-01-20T12:05:10.000Z',
      host: { name: 'server-05', domain: 'test.net' },
      entity: {
        name: 'server-05',
        type: 'Host',
        id: 'host:server-05.test.net',
        EngineMetadata: { Type: 'host', UntypedId: 'server-05.test.net' },
      },
    },
  },
  {
    _index: '.entities.v2.latest.security_default',
    _id: '4bf68ff60fc8b19cec2241992556322a',
    _source: {
      '@timestamp': '2026-01-20T12:05:11.000Z',
      host: { name: 'workstation-05', id: '' },
      entity: {
        name: 'workstation-05',
        type: 'Host',
        id: 'host:workstation-05',
        EngineMetadata: { Type: 'host', UntypedId: 'workstation-05' },
      },
    },
  },
  {
    _index: '.entities.v2.latest.security_default',
    _id: '40b5875887d5e812570327b9604425a6',
    _source: {
      '@timestamp': '2026-01-20T12:05:12.000Z',
      host: { domain: 'corp.local', hostname: 'workstation-20' },
      entity: {
        name: 'workstation-20.corp.local',
        type: 'Host',
        id: 'host:workstation-20.corp.local',
        EngineMetadata: { Type: 'host', UntypedId: 'workstation-20.corp.local' },
      },
    },
  },
  {
    _index: '.entities.v2.latest.security_default',
    _id: 'a5d3d8b58538b9ee1ca73b50d15d4b52',
    _source: {
      '@timestamp': '2026-01-20T12:05:13.000Z',
      host: { name: 'server-06', domain: '' },
      entity: {
        name: 'server-06',
        type: 'Host',
        id: 'host:server-06',
        EngineMetadata: { Type: 'host', UntypedId: 'server-06' },
      },
    },
  },
  {
    _index: '.entities.v2.latest.security_default',
    _id: 'ad6d0148f3ab302b6d9389a05e04e01d',
    _source: {
      '@timestamp': '2026-01-20T12:05:16.000Z',
      host: { entity: { id: 'host-505' } },
      entity: {
        name: 'host-505',
        type: 'Host',
        id: 'host:host-505',
        EngineMetadata: { Type: 'host', UntypedId: 'host-505' },
      },
    },
  },
  {
    _index: '.entities.v2.latest.security_default',
    _id: 'dbc04494402b73d5414cdf90850d777e',
    _source: {
      '@timestamp': '2026-01-20T12:05:17.000Z',
      host: { id: 'host-606' },
      entity: {
        name: 'host-606',
        type: 'Host',
        id: 'host:host-606',
        EngineMetadata: { Type: 'host', UntypedId: 'host-606' },
      },
    },
  },
  {
    _index: '.entities.v2.latest.security_default',
    _id: 'f69c44458b36688926b09ed388c8b5be',
    _source: {
      '@timestamp': '2026-01-20T12:05:17.000Z',
      host: { name: 'server-08', domain: 'corp.local', hostname: 'laptop-02' },
      entity: {
        name: 'server-08',
        type: 'Host',
        id: 'host:server-08.corp.local',
        EngineMetadata: { Type: 'host', UntypedId: 'server-08.corp.local' },
      },
    },
  },
  {
    _index: '.entities.v2.latest.security_default',
    _id: '68c7ffbdcf9404e4494ac43a83719ef5',
    _source: {
      '@timestamp': '2026-01-20T12:05:18.000Z',
      host: { name: 'server-07' },
      entity: {
        name: 'server-07',
        type: 'Host',
        id: 'host:server-07',
        EngineMetadata: { Type: 'host', UntypedId: 'server-07' },
      },
    },
  },
  {
    _index: '.entities.v2.latest.security_default',
    _id: '1fba7560b67c8b51827bac3b6c86fce1',
    _source: {
      '@timestamp': '2026-01-20T12:05:18.000Z',
      host: { hostname: 'workstation-30' },
      entity: {
        name: 'workstation-30',
        type: 'Host',
        id: 'host:workstation-30',
        EngineMetadata: { Type: 'host', UntypedId: 'workstation-30' },
      },
    },
  },
];

export const expectedUserEntities = [
  {
    _index: '.entities.v2.latest.security_default',
    _id: '1d9cb6c21dfa9156571de1281d707719',
    _source: {
      '@timestamp': '2026-01-20T12:05:00.000Z',
      user: { name: 'john.doe' },
      host: { entity: { id: 'host-123' } },
      entity: {
        name: 'john.doe',
        type: 'Identity',
        id: 'user:john.doe@host-123',
        EngineMetadata: { Type: 'user', UntypedId: 'john.doe@host-123' },
      },
    },
  },
  {
    _index: '.entities.v2.latest.security_default',
    _id: '34e67fc3f53984dbfd0ed097197cc453',
    _source: {
      '@timestamp': '2026-01-20T12:05:01.000Z',
      user: { name: 'jane.smith' },
      host: { id: 'host-456' },
      entity: {
        name: 'jane.smith',
        type: 'Identity',
        id: 'user:jane.smith@host-456',
        EngineMetadata: { Type: 'user', UntypedId: 'jane.smith@host-456' },
      },
    },
  },
  {
    _index: '.entities.v2.latest.security_default',
    _id: 'ba6d49220ff970733fff891e87d09e56',
    _source: {
      '@timestamp': '2026-01-20T12:05:02.000Z',
      user: { name: 'bob.jones' },
      host: { name: 'server-01' },
      entity: {
        name: 'bob.jones',
        type: 'Identity',
        id: 'user:bob.jones@server-01',
        EngineMetadata: { Type: 'user', UntypedId: 'bob.jones@server-01' },
      },
    },
  },
  {
    _index: '.entities.v2.latest.security_default',
    _id: 'd0ddd45157d6fe1cbde790dea38d8817',
    _source: {
      '@timestamp': '2026-01-20T12:05:03.000Z',
      user: { name: 'alice.brown', id: 'user-789' },
      entity: {
        name: 'alice.brown',
        type: 'Identity',
        id: 'user:user-789',
        EngineMetadata: { Type: 'user', UntypedId: 'user-789' },
      },
    },
  },
  {
    _index: '.entities.v2.latest.security_default',
    _id: '025d1e3fbf1982fba259d37978ee5709',
    _source: {
      '@timestamp': '2026-01-20T12:05:04.000Z',
      entity: {
        name: 'non-generated-user',
        type: 'Identity',
        id: 'user:non-generated-user',
        EngineMetadata: { Type: 'user', UntypedId: 'non-generated-user' },
      },
    },
  },
  {
    _index: '.entities.v2.latest.security_default',
    _id: 'bd55eef67b506ab8735e6f0f59e8bee8',
    _source: {
      '@timestamp': '2026-01-20T12:05:04.000Z',
      user: { id: 'user-101' },
      entity: {
        name: 'user-101',
        type: 'Identity',
        id: 'user:user-101',
        EngineMetadata: { Type: 'user', UntypedId: 'user-101' },
      },
    },
  },
  {
    _index: '.entities.v2.latest.security_default',
    _id: '6f42b467570b3e7ab0d0ae8b60965648',
    _source: {
      '@timestamp': '2026-01-20T12:05:05.000Z',
      user: { email: 'test@example.com' },
      entity: {
        name: 'test@example.com',
        type: 'Identity',
        id: 'user:test@example.com',
        EngineMetadata: { Type: 'user', UntypedId: 'test@example.com' },
      },
    },
  },
  {
    _index: '.entities.v2.latest.security_default',
    _id: '3d6f612371ad997ae58098380912c307',
    _source: {
      '@timestamp': '2026-01-20T12:05:06.000Z',
      user: { domain: 'corp', name: 'charlie.wilson' },
      entity: {
        name: 'charlie.wilson',
        type: 'Identity',
        id: 'user:charlie.wilson@corp',
        EngineMetadata: { Type: 'user', UntypedId: 'charlie.wilson@corp' },
      },
    },
  },
  {
    _index: '.entities.v2.latest.security_default',
    _id: 'a870b6e8cd872aeb6696cc70997484fd',
    _source: {
      '@timestamp': '2026-01-20T12:05:07.000Z',
      user: { name: 'david.lee' },
      entity: {
        name: 'david.lee',
        type: 'Identity',
        id: 'user:david.lee',
        EngineMetadata: { Type: 'user', UntypedId: 'david.lee' },
      },
    },
  },
  {
    _index: '.entities.v2.latest.security_default',
    _id: 'c049dff0ed865eb3709c2577344652df',
    _source: {
      '@timestamp': '2026-01-20T12:05:08.000Z',
      user: { name: '', id: 'user-202' },
      entity: {
        name: 'user-202',
        type: 'Identity',
        id: 'user:user-202',
        EngineMetadata: { Type: 'user', UntypedId: 'user-202' },
      },
    },
  },
  {
    _index: '.entities.v2.latest.security_default',
    _id: '7b71429fa06bece73a69aa3b6c111933',
    _source: {
      '@timestamp': '2026-01-20T12:05:09.000Z',
      user: { id: 'user-303' },
      entity: {
        name: 'user-303',
        type: 'Identity',
        id: 'user:user-303',
        EngineMetadata: { Type: 'user', UntypedId: 'user-303' },
      },
    },
  },
  {
    _index: '.entities.v2.latest.security_default',
    _id: 'a71d3785ad04601f4b98990e871cd82b',
    _source: {
      '@timestamp': '2026-01-20T12:05:10.000Z',
      user: { name: 'eve.martin' },
      host: { entity: { id: '' }, id: 'host-404' },
      entity: {
        name: 'eve.martin',
        type: 'Identity',
        id: 'user:eve.martin@host-404',
        EngineMetadata: { Type: 'user', UntypedId: 'eve.martin@host-404' },
      },
    },
  },
  {
    _index: '.entities.v2.latest.security_default',
    _id: 'd4ccc5552730aec959408caca3473ee7',
    _source: {
      '@timestamp': '2026-01-20T12:05:11.000Z',
      user: { name: 'frank.taylor' },
      host: { id: '', name: 'workstation-05' },
      entity: {
        name: 'frank.taylor',
        type: 'Identity',
        id: 'user:frank.taylor@workstation-05',
        EngineMetadata: { Type: 'user', UntypedId: 'frank.taylor@workstation-05' },
      },
    },
  },
  {
    _index: '.entities.v2.latest.security_default',
    _id: '9c2027667a9851d44876ae4e4008b108',
    _source: {
      '@timestamp': '2026-01-20T12:05:12.000Z',
      user: { email: 'grace@example.com', name: 'grace.anderson' },
      entity: {
        name: 'grace.anderson',
        type: 'Identity',
        id: 'user:grace@example.com',
        EngineMetadata: { Type: 'user', UntypedId: 'grace@example.com' },
      },
    },
  },
  {
    _index: '.entities.v2.latest.security_default',
    _id: 'fcaaebb1c3ef5431de17f325a54bf97f',
    _source: {
      '@timestamp': '2026-01-20T12:05:13.000Z',
      user: { name: 'henry.clark' },
      entity: {
        name: 'henry.clark',
        type: 'Identity',
        id: 'user:henry.clark',
        EngineMetadata: { Type: 'user', UntypedId: 'henry.clark' },
      },
    },
  },
  {
    _index: '.entities.v2.latest.security_default',
    _id: '8b8b96fb0537d319e1397a175681a6b6',
    _source: {
      '@timestamp': '2026-01-20T12:05:14.000Z',
      user: { domain: '', name: 'iris.davis' },
      entity: {
        name: 'iris.davis',
        type: 'Identity',
        id: 'user:iris.davis',
        EngineMetadata: { Type: 'user', UntypedId: 'iris.davis' },
      },
    },
  },
  {
    _index: '.entities.v2.latest.security_default',
    _id: '4b11dd6cf7a4b049ce8afd5f38064094',
    _source: {
      '@timestamp': '2026-01-20T12:05:15.000Z',
      user: { name: 'jack.white' },
      entity: {
        name: 'jack.white',
        type: 'Identity',
        id: 'user:jack.white',
        EngineMetadata: { Type: 'user', UntypedId: 'jack.white' },
      },
    },
  },
  {
    _index: '.entities.v2.latest.security_default',
    _id: '9211621cb08e16e69dc48158e35579c8',
    _source: {
      '@timestamp': '2026-01-20T12:05:16.000Z',
      user: { name: 'karen.green', id: 'user-505' },
      host: { entity: { id: 'host-505' } },
      entity: {
        name: 'karen.green',
        type: 'Identity',
        id: 'user:karen.green@host-505',
        EngineMetadata: { Type: 'user', UntypedId: 'karen.green@host-505' },
      },
    },
  },
  {
    _index: '.entities.v2.latest.security_default',
    _id: '5a3d5fc12af596c35c9bcce0ec15e297',
    _source: {
      '@timestamp': '2026-01-20T12:05:17.000Z',
      user: { email: 'larry@example.com', name: 'larry.black' },
      host: { id: 'host-606' },
      entity: {
        name: 'larry.black',
        type: 'Identity',
        id: 'user:larry.black@host-606',
        EngineMetadata: { Type: 'user', UntypedId: 'larry.black@host-606' },
      },
    },
  },
  {
    _index: '.entities.v2.latest.security_default',
    _id: '855f0e0353f2a443af0c6baea478a6d8',
    _source: {
      '@timestamp': '2026-01-20T12:05:18.000Z',
      user: { domain: 'corp', name: 'mary.blue' },
      host: { name: 'server-07' },
      entity: {
        name: 'mary.blue',
        type: 'Identity',
        id: 'user:mary.blue@server-07',
        EngineMetadata: { Type: 'user', UntypedId: 'mary.blue@server-07' },
      },
    },
  },
];

export const expectedServiceEntities = [
  {
    _index: '.entities.v2.latest.security_default',
    _id: '15b621f577206d843980a40d38554c70',
    _source: {
      '@timestamp': '2026-01-20T12:05:04.000Z',
      entity: {
        name: 'non-generated-service-id',
        type: 'Service',
        id: 'service:non-generated-service-id',
        EngineMetadata: { Type: 'service', UntypedId: 'non-generated-service-id' },
      },
    },
  },
  {
    _index: '.entities.v2.latest.security_default',
    _id: '0f9d5fcd02e63ca500ca9515f76ce174',
    _source: {
      '@timestamp': '2026-01-20T12:05:05.000Z',
      entity: {
        name: 'service-name',
        type: 'Service',
        id: 'service:service-name',
        EngineMetadata: { Type: 'service', UntypedId: 'service-name' },
      },
    },
  },
];

export const expectedGenericEntities = [
  {
    _index: '.entities.v2.latest.security_default',
    _id: '9e606449c558b5253d8b1f028fe7dca0',
    _source: {
      '@timestamp': '2026-01-20T12:05:05.000Z',
      entity: {
        name: 'generic-id',
        id: 'generic:generic-id',
        EngineMetadata: { Type: 'generic', UntypedId: 'generic-id' },
      },
    },
  },
];
