/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { FtrProviderContext } from '../../ftr_provider_context';

export default function({ getService }: FtrProviderContext) {
  const supertest = getService('supertest');

  describe('Privileges', () => {
    describe('GET /api/security/privileges', () => {
      it('should return a privilege map with all known privileges, without actions', async () => {
        await supertest
          .get('/api/security/privileges')
          .set('kbn-xsrf', 'xxx')
          .send()
          .expect(200, {
            // If you're adding a privilege to the following, that's great!
            // If you're removing a privilege, this breaks backwards compatibility
            // Roles are associated with these privileges, and we shouldn't be removing them in a minor version.
            features: {
              discover: ['all', 'read'],
              visualize: ['all', 'read'],
              dashboard: ['all', 'read'],
              dev_tools: ['all', 'read'],
              advancedSettings: ['all', 'read'],
              indexPatterns: ['all', 'read'],
              savedObjectsManagement: ['all', 'read'],
              timelion: ['all', 'read'],
              graph: ['all', 'read'],
              maps: ['all', 'read'],
              canvas: ['all', 'read'],
              infrastructure: ['all', 'read'],
              logs: ['all', 'read'],
              uptime: ['all', 'read'],
              apm: ['all', 'read'],
              siem: ['all', 'read'],
            },
            global: ['all', 'read'],
            space: ['all', 'read'],
            reserved: ['monitoring', 'ml'],
          });
      });
    });
  });
}
