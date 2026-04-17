/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { expect } from '@kbn/scout-security/api';
import type { SearchHitsMetadata } from '@elastic/elasticsearch/lib/api/types';
import { getLatestEntitiesIndexName } from '../../../../common/domain/entity_index';

const LATEST_INDEX = getLatestEntitiesIndexName('default');
type Hits = SearchHitsMetadata<unknown>['hits'];

// Takes non sorted hits and compares them by _id
export function assertEntitiesEqual(expected: Hits, actual: Hits) {
  expect(actual).toHaveLength(expected.length);
  for (const expectedHit of expected) {
    const actualHit = actual.find((h) => h._id === expectedHit._id);
    expect(actualHit, `Could not find hit with id ${expectedHit._id}`).toBeDefined();
    expect(actualHit).toMatchObject(expectedHit);
  }
}

export const expectedHostEntities: Hits = [
  {
    _index: LATEST_INDEX,
    _id: '5c4590a1e799d5fa9d43908d6f609027f1caa55efef5979757a094cfd80f2f81',
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
    _index: LATEST_INDEX,
    _id: '3ba8efeb63e3aa8c0e7272b25c5e443670e87ac1a78e9e67687da0ee9b7a4b5f',
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
    _index: LATEST_INDEX,
    _id: '59093c7a60d8eb6d70d09ba7cde21ef58774fee0fe3738498b746b98968d8046',
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
    _index: LATEST_INDEX,
    _id: 'f8878d2ea2a52d05b08097538e92c89a0146320d0b8f5169d26f7b3d96336918',
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
    _index: LATEST_INDEX,
    _id: '897ba3ebc6ad71a081e7fc69b79473abaf6d425ab3c42a08e3f92b9a6bac7412',
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
    _index: LATEST_INDEX,
    _id: '6746dba00f1e5062c513ff8b4b8707069894308b12a69bd590763ae56880dda9',
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
    _index: LATEST_INDEX,
    _id: '60cde316aec6a9697ea87bfc44cf2b8c492e1a81408b6c955d367a47a77841c9',
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
    _index: LATEST_INDEX,
    _id: '2fb2f574f23c5013662d0e90cb88956b925f54ce381f605ce43970ab9d226fa5',
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
    _index: LATEST_INDEX,
    _id: '09bcd5d78b75a3adef2a52e183f655d678e148594ff151552d119c44a6d0a878',
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
    _index: LATEST_INDEX,
    _id: 'b0a7cfbcf83d479cf075035daad72b41c3de8ce811d2f6897318f9bc1bb987ac',
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
    _index: LATEST_INDEX,
    _id: '768eb4b39da6860133158f0bd8e150bb35a6ddafa36a16835876994be3eb1282',
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
    _index: LATEST_INDEX,
    _id: 'c08cb55dbe4f377ab1def9e763a82e0f9bf06cf231618e1353982569a7cb0077',
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
    _index: LATEST_INDEX,
    _id: 'b15370fcb6af62f86e08adfc76d6a4bbddf608c99dd413a328b141c3bc856baa',
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
    _index: LATEST_INDEX,
    _id: 'ef614751487e09e78b059dabbe45f3520990f98ba845ace99f393c77f887d2da',
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
    _index: LATEST_INDEX,
    _id: 'a81cc7862183be0830ee40949661eb3892d2b1f0c9d1d536e6f88e6774c7dfdd',
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
    _index: LATEST_INDEX,
    _id: '92a7476f32e5e8edec138184b41959c82fa37050841e24c58d07500addd57aa2',
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
    _index: LATEST_INDEX,
    _id: '1632a83b7ec4a14465d1af6d1896969cf1dc5c212d2a71b2a17087c8de799b7a',
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
    _index: LATEST_INDEX,
    _id: 'a8f8ffa08603e5be512b0568c0ac960cac5082415f60a133cc4bac22b87d5e31',
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
    _index: LATEST_INDEX,
    _id: 'a46f698d3e156552cbbe33a7640f980187edeaeb241e2b13f3549576f0b67e28',
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
  {
    _index: LATEST_INDEX,
    _id: 'f02169eec02621bcecb234b58b06cec66357c1553c9914fd3f049d234e3008d8',
    _source: {
      '@timestamp': '2026-01-20T12:05:23.000Z',
      host: { id: 'host-nonidp-001' },
      entity: {
        name: 'host-nonidp-001',
        type: 'Host',
        id: 'host:host-nonidp-001',
        EngineMetadata: { Type: 'host', UntypedId: 'host-nonidp-001' },
      },
    },
  },
];

export const expectedUserEntities: Hits = [
  {
    _index: LATEST_INDEX,
    _id: 'b567c98b4ef4ba050d3201175d7cbf1ef5a4377e10f1a7ca23f8f7b2c384dbb4',
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
    _index: LATEST_INDEX,
    _id: '3d2e874ed64e8b5c6b3cd7a72f620dd5e4f1be97e6faab4da281f8b8f6c04913',
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
    _index: LATEST_INDEX,
    _id: 'f54b6e21827a7e18b4dfc4736893d3766a9db81bec6e806a1c9afe7fffe3571c',
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
    _index: LATEST_INDEX,
    _id: 'f1e9f0712f2e4f2dc13612daebe203fac9c8c56dcc0b4c3575af8cfdbd05e095',
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
    _index: LATEST_INDEX,
    _id: 'da02d432b766ee35f68647f9714f619611eb5e05e14bb3ae43e5e4f48e2f6f7e',
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
    _index: LATEST_INDEX,
    _id: 'c7ad17bde8724fc1773c8800c2e7adf35ac01661bbd8321fe3f37fd50c5118c6',
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
    _index: LATEST_INDEX,
    _id: 'bbbdc4f04c4e3d052dc35f846de9044c144f729499ec0948cf55882e8fc4e33a',
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
    _index: LATEST_INDEX,
    _id: '62c5dd196f6e5e6c82d94043e99b51fcaf6e976bd4e2a9f0a507f27447d5dc3f',
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
    _index: LATEST_INDEX,
    _id: '43d3c510e836c10954b768e31075f42830d555751c01bdcf2c3a068c2e601174',
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
    _index: LATEST_INDEX,
    _id: '05547ae5914edf47b9fbd787dedd38148c3f8240c542c1419851718722e8ed1c',
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
    _index: LATEST_INDEX,
    _id: '526f58f4a72a4e80f9b95d4a3cd3f67f227c06843a2854336a257b844e2a4489',
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
    _index: LATEST_INDEX,
    _id: 'a797c8c22378d097a5c2a04496a8d7a62d6f44bf2c4bb3fc59a4863e36e159da',
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
    _index: LATEST_INDEX,
    _id: 'fe44b2619de15aa30170dde991ee224069d210beda4db607e4bce75bae4c1746',
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
    _index: LATEST_INDEX,
    _id: '034deba2c721973f2116bccea7d63b237ac1e380208dc9b1c4d555f616b9adfe',
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
    _index: LATEST_INDEX,
    _id: '42df55aa9b3d15a3b0af954aa93c68556cd5bcae0f61796fff74bffffdb51434',
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
    _index: LATEST_INDEX,
    _id: '1d138cf603a471abef52ffb6333d63dadcf9e34af1788f539cf999c8230727c9',
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
    _index: LATEST_INDEX,
    _id: 'd2e88c95d22d9a787c932b72328f7d47cade891dda0bc7d8b823b14cf3fc3e23',
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
    _index: LATEST_INDEX,
    _id: '5404b10c22698b0ec86abec4c3bc429a8f8f063ed1dc6eee24b127a3521e9d63',
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
    _index: LATEST_INDEX,
    _id: '7b4db899b11d212ff774f38b2253ec037fa88c1592ce5df752045879d8c35872',
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
    _index: LATEST_INDEX,
    _id: '1f49dd57680b1986183a83644a0182b64b921c84e3e464a98a25664186b38f30',
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
    _index: LATEST_INDEX,
    _id: '810b6c4feac1dcb16d1d8c428170eae525b7043421d5955a2ebdbe3e811ae5f2',
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
    _index: LATEST_INDEX,
    _id: '6d0b61db6529233f9e39eedfc91919e526d7b55d2d9e395c26f8fbce1b5541b5',
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
    _index: LATEST_INDEX,
    _id: '139e9d308ffadedbca2ecdcc1d2b6f2ebed8f53a3a33f9bc11328574389f76f3',
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
    _index: LATEST_INDEX,
    _id: 'fb171d701c968880c3eac6a1375c01a8335220f921d1f6d3d35e01e4396b4b74',
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
  {
    _index: LATEST_INDEX,
    _id: '18668fc50a8bfceef942a50bc1bb0dad7d1b503efa7dd55b4da8bf5086f9e42d',
    _source: {
      '@timestamp': '2026-01-20T12:05:23.000Z',
      user: { name: 'alice.local' },
      host: { id: 'host-nonidp-001' },
      entity: {
        name: 'alice.local',
        type: 'Identity',
        id: 'user:alice.local@host-nonidp-001@local',
        EngineMetadata: { Type: 'user', UntypedId: 'alice.local@host-nonidp-001@local' },
      },
    },
  },
];

export const expectedServiceEntities: Hits = [
  {
    _index: LATEST_INDEX,
    _id: '4a03614567f337f8129a115df2fa0ee23657227a4e3c5bcaf6a06e5a295a77a9',
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
    _index: LATEST_INDEX,
    _id: 'c3e453f58f98e329531f73ca57250f78449f73989748271ade0a9880d3255a6a',
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

export const expectedGenericEntities: Hits = [
  {
    _index: LATEST_INDEX,
    _id: 'd98cd38cf7da05a3c32920813a0529fbc6fff7312d0bf774e85e1fc273a5ffdb',
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
