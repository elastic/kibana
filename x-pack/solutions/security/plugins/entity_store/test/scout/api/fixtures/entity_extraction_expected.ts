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
    _id: 'd5b2488f87685ca7ef426aad7ccc777e',
    _source: {
      '@timestamp': '2026-01-20T12:05:02.000Z',
      host: { domain: 'example.com', name: 'server-01' },
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
    _id: '934bc21e8f973c51aafc12cf6d7e2182',
    _source: {
      '@timestamp': '2026-01-20T12:05:03.000Z',
      host: { domain: 'test.org', hostname: 'domain-only-host' },
      entity: {
        name: 'domain-only-host',
        type: 'Host',
        id: 'host:domain-only-host',
        EngineMetadata: { Type: 'host', UntypedId: 'domain-only-host' },
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
      host: { hostname: 'workstation-10', id: 'host-789' },
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
    _id: '17d1516154981894f9b6b33ed0a5f376',
    _source: {
      '@timestamp': '2026-01-20T12:05:08.000Z',
      host: { name: 'server-03', domain: 'test.com', hostname: 'backup-server' },
      entity: {
        name: 'server-03',
        type: 'Host',
        id: 'host:server-03',
        EngineMetadata: { Type: 'host', UntypedId: 'server-03' },
      },
    },
  },
  {
    _index: '.entities.v2.latest.security_default',
    _id: '4ba0b24674c753a7ce7112ef5617163e',
    _source: {
      '@timestamp': '2026-01-20T12:05:09.000Z',
      host: { name: 'server-04' },
      entity: {
        name: 'server-04',
        type: 'Host',
        id: 'host:server-04',
        EngineMetadata: { Type: 'host', UntypedId: 'server-04' },
      },
    },
  },
  {
    _index: '.entities.v2.latest.security_default',
    _id: '9fff579a1f2d32a2c470ed711de1e04b',
    _source: {
      '@timestamp': '2026-01-20T12:05:10.000Z',
      host: { id: 'host-404' },
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
    _id: 'cb46f3f3322e70d1443042d1a7b25392',
    _source: {
      '@timestamp': '2026-01-20T12:05:10.000Z',
      host: { domain: 'test.net', name: 'server-05' },
      entity: {
        name: 'server-05',
        type: 'Host',
        id: 'host:server-05',
        EngineMetadata: { Type: 'host', UntypedId: 'server-05' },
      },
    },
  },
  {
    _index: '.entities.v2.latest.security_default',
    _id: 'e4e2c26804f019603ba4dc39bb3d156a',
    _source: {
      '@timestamp': '2026-01-20T12:05:11.000Z',
      host: { domain: 'example.com', hostname: 'empty-name-host', name: '' },
      entity: {
        name: 'empty-name-host',
        type: 'Host',
        id: 'host:empty-name-host',
        EngineMetadata: { Type: 'host', UntypedId: 'empty-name-host' },
      },
    },
  },
  {
    _index: '.entities.v2.latest.security_default',
    _id: '4bf68ff60fc8b19cec2241992556322a',
    _source: {
      '@timestamp': '2026-01-20T12:05:11.000Z',
      host: { domain: 'corp.local', id: '', name: 'workstation-05' },
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
    _id: 'e261124bb880ea7368c98faa7da81ebc',
    _source: {
      '@timestamp': '2026-01-20T12:05:12.000Z',
      host: { domain: 'corp.local', hostname: 'workstation-20' },
      entity: {
        name: 'workstation-20',
        type: 'Host',
        id: 'host:workstation-20',
        EngineMetadata: { Type: 'host', UntypedId: 'workstation-20' },
      },
    },
  },
  {
    _index: '.entities.v2.latest.security_default',
    _id: 'a5d3d8b58538b9ee1ca73b50d15d4b52',
    _source: {
      '@timestamp': '2026-01-20T12:05:13.000Z',
      host: { domain: '', name: 'server-06' },
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
    _id: 'f4f72af0a17ce6d61931f6712a4a31d4',
    _source: {
      '@timestamp': '2026-01-20T12:05:17.000Z',
      host: { name: 'server-08' },
      entity: {
        name: 'server-08',
        type: 'Host',
        id: 'host:server-08',
        EngineMetadata: { Type: 'host', UntypedId: 'server-08' },
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
    _id: '261870a6cea12b6e1fc583a9dc126174',
    _source: {
      '@timestamp': '2026-01-20T12:05:00.000Z',
      user: { name: 'john.doe' },
      host: { entity: { id: 'host-123' } },
      entity: {
        name: 'john.doe',
        type: 'Identity',
        id: 'user:john.doe@okta',
        EngineMetadata: { Type: 'user', UntypedId: 'john.doe@okta' },
      },
    },
  },
  {
    _index: '.entities.v2.latest.security_default',
    _id: 'd61cd4da553bba392a1d981e99813b64',
    _source: {
      '@timestamp': '2026-01-20T12:05:01.000Z',
      user: { name: 'jane.smith' },
      host: { id: 'host-456' },
      entity: {
        name: 'jane.smith',
        type: 'Identity',
        id: 'user:jane.smith@entra_id',
        EngineMetadata: { Type: 'user', UntypedId: 'jane.smith@entra_id' },
      },
    },
  },
  {
    _index: '.entities.v2.latest.security_default',
    _id: 'ef0d2dde6f4a97a4014d3af87e08e440',
    _source: {
      '@timestamp': '2026-01-20T12:05:02.000Z',
      user: { name: 'bob.jones' },
      host: { name: 'server-01' },
      entity: {
        name: 'bob.jones',
        type: 'Identity',
        id: 'user:bob.jones@entra_id',
        EngineMetadata: { Type: 'user', UntypedId: 'bob.jones@entra_id' },
      },
    },
  },
  {
    _index: '.entities.v2.latest.security_default',
    _id: 'e74b74aa915d74830488d4d7daacf43a',
    _source: {
      '@timestamp': '2026-01-20T12:05:03.000Z',
      user: { name: 'alice.brown', id: 'user-789' },
      entity: {
        name: 'alice.brown',
        type: 'Identity',
        id: 'user:user-789@microsoft_365',
        EngineMetadata: { Type: 'user', UntypedId: 'user-789@microsoft_365' },
      },
    },
  },
  {
    _index: '.entities.v2.latest.security_default',
    _id: '28ac9cb0b4ccfb93ec0cab9046747514',
    _source: {
      '@timestamp': '2026-01-20T12:05:04.000Z',
      entity: {
        name: 'arnlod.schmidt',
        type: 'Identity',
        id: 'user:arnlod.schmidt@elastic.co@active_directory',
        EngineMetadata: { Type: 'user', UntypedId: 'arnlod.schmidt@elastic.co@active_directory' },
      },
    },
  },
  {
    _index: '.entities.v2.latest.security_default',
    _id: 'c752e4150545f512207d03943d1fd06f',
    _source: {
      '@timestamp': '2026-01-20T12:05:04.000Z',
      user: { id: 'user-101' },
      entity: {
        name: 'user-101@microsoft_365',
        type: 'Identity',
        id: 'user:user-101@microsoft_365',
        EngineMetadata: { Type: 'user', UntypedId: 'user-101@microsoft_365' },
      },
    },
  },
  {
    _index: '.entities.v2.latest.security_default',
    _id: '2ad665aff3d81324d733b4811ae0839d',
    _source: {
      '@timestamp': '2026-01-20T12:05:05.000Z',
      user: { email: 'test@example.com' },
      entity: {
        name: 'test@example.com@okta',
        type: 'Identity',
        id: 'user:test@example.com@okta',
        EngineMetadata: { Type: 'user', UntypedId: 'test@example.com@okta' },
      },
    },
  },
  {
    _index: '.entities.v2.latest.security_default',
    _id: '725d5a8408a77ccc3592e8580e7faf2a',
    _source: {
      '@timestamp': '2026-01-20T12:05:06.000Z',
      user: { domain: 'corp', name: 'charlie.wilson' },
      entity: {
        name: 'charlie.wilson',
        type: 'Identity',
        id: 'user:charlie.wilson@corp@aws',
        EngineMetadata: { Type: 'user', UntypedId: 'charlie.wilson@corp@aws' },
      },
    },
  },
  {
    _index: '.entities.v2.latest.security_default',
    _id: '68844d2ff831ef513e9161920c99f3f5',
    _source: {
      '@timestamp': '2026-01-20T12:05:07.000Z',
      user: { name: 'david.lee' },
      entity: {
        name: 'david.lee',
        type: 'Identity',
        id: 'user:david.lee@gcp',
        EngineMetadata: { Type: 'user', UntypedId: 'david.lee@gcp' },
      },
    },
  },
  {
    _index: '.entities.v2.latest.security_default',
    _id: '781c11882c999bfe1e5abea4a1efc957',
    _source: {
      '@timestamp': '2026-01-20T12:05:08.000Z',
      user: { name: '', id: 'user-202' },
      entity: {
        name: 'user-202@okta',
        type: 'Identity',
        id: 'user:user-202@okta',
        EngineMetadata: { Type: 'user', UntypedId: 'user-202@okta' },
      },
    },
  },
  {
    _index: '.entities.v2.latest.security_default',
    _id: '2a607f0c69df13ce9e87917e060b6187',
    _source: {
      '@timestamp': '2026-01-20T12:05:09.000Z',
      user: { id: 'user-303' },
      entity: {
        name: 'user-303@entra_id',
        type: 'Identity',
        id: 'user:user-303@entra_id',
        EngineMetadata: { Type: 'user', UntypedId: 'user-303@entra_id' },
      },
    },
  },
  {
    _index: '.entities.v2.latest.security_default',
    _id: '7364b12841cc03684b914e8030fef006',
    _source: {
      '@timestamp': '2026-01-20T12:05:10.000Z',
      user: { name: 'eve.martin' },
      host: { entity: { id: '' }, id: 'host-404' },
      entity: {
        name: 'eve.martin',
        type: 'Identity',
        id: 'user:eve.martin@microsoft_365',
        EngineMetadata: { Type: 'user', UntypedId: 'eve.martin@microsoft_365' },
      },
    },
  },
  {
    _index: '.entities.v2.latest.security_default',
    _id: '6ad44ae06e03650c5dd7aca3b2a8f10e',
    _source: {
      '@timestamp': '2026-01-20T12:05:11.000Z',
      user: { name: 'frank.taylor' },
      host: { id: '', name: 'workstation-05' },
      entity: {
        name: 'frank.taylor',
        type: 'Identity',
        id: 'user:frank.taylor@active_directory',
        EngineMetadata: { Type: 'user', UntypedId: 'frank.taylor@active_directory' },
      },
    },
  },
  {
    _index: '.entities.v2.latest.security_default',
    _id: '0d4cb781d8fd1c26dde6c8bff9aedc12',
    _source: {
      '@timestamp': '2026-01-20T12:05:12.000Z',
      user: { email: 'grace@example.com', name: 'grace.anderson' },
      entity: {
        name: 'grace.anderson',
        type: 'Identity',
        id: 'user:grace@example.com@okta',
        EngineMetadata: { Type: 'user', UntypedId: 'grace@example.com@okta' },
      },
    },
  },
  {
    _index: '.entities.v2.latest.security_default',
    _id: '5ef1b1d34000dcbba643e5d1abfbfed7',
    _source: {
      '@timestamp': '2026-01-20T12:05:13.000Z',
      user: { name: 'henry.clark' },
      entity: {
        name: 'henry.clark',
        type: 'Identity',
        id: 'user:henry.clark@entra_id',
        EngineMetadata: { Type: 'user', UntypedId: 'henry.clark@entra_id' },
      },
    },
  },
  {
    _index: '.entities.v2.latest.security_default',
    _id: '69c411f02935a3f626c6e86621c5151f',
    _source: {
      '@timestamp': '2026-01-20T12:05:14.000Z',
      user: { domain: '', name: 'iris.davis' },
      entity: {
        name: 'iris.davis',
        type: 'Identity',
        id: 'user:iris.davis@aws',
        EngineMetadata: { Type: 'user', UntypedId: 'iris.davis@aws' },
      },
    },
  },
  {
    _index: '.entities.v2.latest.security_default',
    _id: '4eedae8c46980b421f482f3b443b4eeb',
    _source: {
      '@timestamp': '2026-01-20T12:05:15.000Z',
      user: { name: 'jack.white' },
      entity: {
        name: 'jack.white',
        type: 'Identity',
        id: 'user:jack.white@gcp',
        EngineMetadata: { Type: 'user', UntypedId: 'jack.white@gcp' },
      },
    },
  },
  {
    _index: '.entities.v2.latest.security_default',
    _id: '8ecf2dbd6b527eb9f28dafbc915c8540',
    _source: {
      '@timestamp': '2026-01-20T12:05:16.000Z',
      user: { name: 'karen.green', id: 'user-505' },
      host: { entity: { id: 'host-505' } },
      entity: {
        name: 'karen.green',
        type: 'Identity',
        id: 'user:user-505@okta',
        EngineMetadata: { Type: 'user', UntypedId: 'user-505@okta' },
      },
    },
  },
  {
    _index: '.entities.v2.latest.security_default',
    _id: 'bab9aeab6cd3406b267a98ee43ceddfb',
    _source: {
      '@timestamp': '2026-01-20T12:05:17.000Z',
      user: { email: 'larry@example.com', name: 'larry.black' },
      host: { id: 'host-606' },
      entity: {
        name: 'larry.black',
        type: 'Identity',
        id: 'user:larry@example.com@entra_id',
        EngineMetadata: { Type: 'user', UntypedId: 'larry@example.com@entra_id' },
      },
    },
  },
  {
    _index: '.entities.v2.latest.security_default',
    _id: '9503edc03052f2ae6b94fbaf553ad9a2',
    _source: {
      '@timestamp': '2026-01-20T12:05:18.000Z',
      user: { domain: 'corp', name: 'mary.blue' },
      host: { name: 'server-07' },
      entity: {
        name: 'mary.blue',
        type: 'Identity',
        id: 'user:mary.blue@corp@active_directory',
        EngineMetadata: { Type: 'user', UntypedId: 'mary.blue@corp@active_directory' },
      },
    },
  },
  {
    _index: '.entities.v2.latest.security_default',
    _id: '5cb0c0bb84d9141af0df2789a245182d',
    _source: {
      '@timestamp': '2026-01-20T12:05:19.000Z',
      user: { name: 'not-captured-no-module' },
      entity: {
        name: 'not-captured-no-module',
        type: 'Identity',
        id: 'user:not-captured-no-module@unknown',
        EngineMetadata: { Type: 'user', UntypedId: 'not-captured-no-module@unknown' },
      },
    },
  },
  {
    _index: '.entities.v2.latest.security_default',
    _id: '70858af64ff6f823645c9f2030942f2f',
    _source: {
      '@timestamp': '2026-01-20T12:05:20.000Z',
      user: { name: 'okta.from.dataset' },
      entity: {
        name: 'okta.from.dataset',
        type: 'Identity',
        id: 'user:okta.from.dataset@okta',
        EngineMetadata: { Type: 'user', UntypedId: 'okta.from.dataset@okta' },
      },
    },
  },
  {
    _index: '.entities.v2.latest.security_default',
    _id: '67e5305b77e994a4e5061980e161917f',
    _source: {
      '@timestamp': '2026-01-20T12:05:21.000Z',
      user: { name: 'cloudtrail.user' },
      entity: {
        name: 'cloudtrail.user',
        type: 'Identity',
        id: 'user:cloudtrail.user@aws',
        EngineMetadata: { Type: 'user', UntypedId: 'cloudtrail.user@aws' },
      },
    },
  },
  {
    _index: '.entities.v2.latest.security_default',
    _id: 'aa9c2809da7706d63d4b195e9ae73a81',
    _source: {
      '@timestamp': '2026-01-20T12:05:22.000Z',
      user: { name: 'no.module.user' },
      entity: {
        name: 'no.module.user',
        type: 'Identity',
        id: 'user:no.module.user@unknown',
        EngineMetadata: { Type: 'user', UntypedId: 'no.module.user@unknown' },
      },
    },
  },
];

export const expectedServiceEntities = [
  {
    _index: '.entities.v2.latest.security_default',
    _id: 'd71824649f3db60bf0a6892863af6e2a',
    _source: {
      '@timestamp': '2026-01-20T12:05:04.000Z',
      entity: {
        name: 'mailchimp',
        type: 'Service',
        id: 'service:mailchimp',
        EngineMetadata: { Type: 'service', UntypedId: 'mailchimp' },
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
    _id: 'c52f04341df58ee3f0ceb4a270e5814b',
    _source: {
      '@timestamp': '2026-01-20T12:05:05.000Z',
      entity: {
        name: 'generic-id',
        id: 'generic-id',
        EngineMetadata: { Type: 'generic', UntypedId: 'generic-id' },
      },
    },
  },
];
