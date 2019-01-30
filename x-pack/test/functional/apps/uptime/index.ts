/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { KibanaFunctionalTestDefaultProviders } from '../../../types/providers';

const ARCHIVE = 'uptime/full_heartbeat';

// tslint:disable-next-line:no-default-export
export default ({ loadTestFile, getService }: KibanaFunctionalTestDefaultProviders) => {
  describe('Uptime app', function() {
    const esArchiver = getService('esArchiver');
    before(async () => {
      await esArchiver.load(ARCHIVE);
    });
    after(async () => await esArchiver.unload(ARCHIVE));
    this.tags('ciGroup6');

    loadTestFile(require.resolve('./overview'));
    loadTestFile(require.resolve('./monitor'));
  });
};
