/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { FtrProviderContext } from '../../common/ftr_provider_context';
import { Spaces } from '../scenarios';

// eslint-disable-next-line import/no-default-export
export default function alertingApiIntegrationTests({
  loadTestFile,
  getService,
}: FtrProviderContext) {
  const spacesService = getService('spaces');
  const esArchiver = getService('esArchiver');

  describe('alerting api integration spaces only', function() {
    this.tags('ciGroup3');

    before(async () => {
      for (const space of Object.values(Spaces)) {
        if (space.id === 'default') continue;

        const { id, name, disabledFeatures } = space;
        await spacesService.create({ id, name, disabledFeatures });
      }
    });

    after(() => esArchiver.unload('empty_kibana'));

    loadTestFile(require.resolve('./actions'));
    loadTestFile(require.resolve('./alerting'));
  });
}
