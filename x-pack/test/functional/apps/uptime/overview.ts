/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { KibanaFunctionalTestDefaultProviders } from '../../../types/providers';

// tslint:disable-next-line:no-default-export
export default ({ getPageObjects, getService }: KibanaFunctionalTestDefaultProviders) => {
  const esArchiver = getService('esArchiver');
  // TODO: add UI functional tests
  // const pageObjects = getPageObjects(['uptime']);
  const archive = 'uptime/full_heartbeat';

  describe('Overview page', () => {
    describe('this is a simple test', () => {
      beforeEach(async () => {
        await esArchiver.load(archive);
      });
      afterEach(async () => await esArchiver.unload(archive));

      // TODO: add UI functional tests
    });
  });
};
