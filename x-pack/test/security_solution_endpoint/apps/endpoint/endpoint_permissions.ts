/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { FtrProviderContext } from '../../ftr_provider_context';
import { ROLES } from '../../../common/services/security_solution';

export default (ftrContext: FtrProviderContext) => {
  describe('Endpoint permissions:', () => {
    before(async () => {
      // load data into the system
      // should we use the data_indexer? or esArchive?
    });

    after(async () => {
      // unload data from the system
    });

    // Run the same set of tests against all of the Security Solution roles
    for (const role of Object.keys(ROLES)) {
      describe(`when running with user/role [${role}]`, () => {
        beforeEach(async () => {
          // create role/user
          //
          // logout of kibana
          //
          // log back in with new uer
        });

        afterEach(async () => {
          // delete role/user
        });

        it('should NOT allow access to endpoint management pages', () => {});

        it('should display endpoint data on Host Details', () => {});

        it('should display endpoint data on Alert Details', () => {});
      });
    }
  });
};
