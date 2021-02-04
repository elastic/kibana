/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import { FtrProviderContext } from '../../ftr_provider_context';

export default function ({ getService }: FtrProviderContext) {
  describe('post_privileges', () => {
    it('should allow privileges to be updated', async () => {
      const es = getService('es');
      const application = 'foo';
      const response = await es.security.putPrivileges({
        body: {
          [application]: {
            all: {
              application,
              name: 'all',
              actions: ['action:*'],
              metadata: {},
            },
            read: {
              application,
              name: 'read',
              actions: ['action:readAction1', 'action:readAction2'],
              metadata: {},
            },
          },
        },
      });

      expect(response.body).to.eql({
        foo: {
          all: { created: true },
          read: { created: true },
        },
      });

      // Update privileges:
      // 1. Not specifying the "all" privilege that we created above
      // 2. Specifying a different collection of "read" actions
      // 3. Adding a new "other" privilege
      const updateResponse = await es.security.putPrivileges({
        body: {
          [application]: {
            read: {
              application,
              name: 'read',
              actions: ['action:readAction1', 'action:readAction4'],
              metadata: {},
            },
            other: {
              application,
              name: 'other',
              actions: ['action:otherAction1'],
              metadata: {},
            },
          },
        },
      });

      expect(updateResponse.body).to.eql({
        foo: {
          other: { created: true },
          read: { created: false },
        },
      });

      const retrievedPrivilege = await es.security.getPrivileges({ application });
      expect(retrievedPrivilege.body).to.eql({
        foo: {
          // "all" is maintained even though the subsequent update did not specify this privilege
          all: {
            application,
            name: 'all',
            actions: ['action:*'],
            metadata: {},
          },
          read: {
            application,
            name: 'read',
            // actions should only contain what was present in the update. The original actions are not persisted or merged here.
            actions: ['action:readAction1', 'action:readAction4'],
            metadata: {},
          },
          other: {
            application,
            name: 'other',
            actions: ['action:otherAction1'],
            metadata: {},
          },
        },
      });
    });
  });
}
