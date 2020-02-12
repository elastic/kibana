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
              discover: ['all', 'read', 'minimal_all', 'minimal_read', 'url_create'],
              visualize: ['all', 'read', 'minimal_all', 'minimal_read', 'url_create'],
              dashboard: ['all', 'read', 'minimal_all', 'minimal_read', 'url_create'],
              dev_tools: ['all', 'read', 'minimal_all', 'minimal_read'],
              advancedSettings: ['all', 'read', 'minimal_all', 'minimal_read'],
              indexPatterns: ['all', 'read', 'minimal_all', 'minimal_read'],
              savedObjectsManagement: ['all', 'read', 'minimal_all', 'minimal_read'],
              timelion: ['all', 'read', 'minimal_all', 'minimal_read'],
              graph: ['all', 'read', 'minimal_all', 'minimal_read'],
              maps: ['all', 'read', 'minimal_all', 'minimal_read'],
              canvas: ['all', 'read', 'minimal_all', 'minimal_read'],
              infrastructure: ['all', 'read', 'minimal_all', 'minimal_read'],
              logs: ['all', 'read', 'minimal_all', 'minimal_read'],
              uptime: ['all', 'read', 'minimal_all', 'minimal_read'],
              apm: ['all', 'read', 'minimal_all', 'minimal_read'],
              siem: ['all', 'read', 'minimal_all', 'minimal_read'],
              endpoint: ['all', 'read', 'minimal_all', 'minimal_read'],
            },
            global: ['all', 'read'],
            space: ['all', 'read'],
            reserved: ['monitoring', 'ml'],
          });
      });
    });
  });
}
