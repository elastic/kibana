/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { SpacesService } from '../../../common/services';
import { FtrProviderContext } from '../../common/ftr_provider_context';
import { Spaces } from '../scenarios';

// eslint-disable-next-line import/no-default-export
export default function alertingApiIntegrationTests({
  loadTestFile,
  getService,
}: FtrProviderContext) {
  const spacesService: SpacesService = getService('spaces');
  const esArchiver = getService('esArchiver');

  describe('alerting api integration spaces only', function() {
    this.tags('ciGroup8');

    before(async () => {
      for (const space of Object.values(Spaces)) {
        await spacesService.create(space);
      }
    });

    after(() => esArchiver.unload('empty_kibana'));

    loadTestFile(require.resolve('./actions'));
    loadTestFile(require.resolve('./alerting'));
  });
}
