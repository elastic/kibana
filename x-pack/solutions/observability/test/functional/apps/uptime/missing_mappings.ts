/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { makeCheck } from '../../../api_integration/apis/uptime/rest/helper/make_checks';
import { FtrProviderContext } from '../../ftr_provider_context';

export default ({ getPageObjects, getService }: FtrProviderContext) => {
  const { common } = getPageObjects(['common']);
  const uptimeService = getService('uptime');

  const es = getService('es');
  describe('missing mappings', function () {
    before(async () => {
      await makeCheck({ es });
      await common.navigateToApp('uptime');
    });

    it('redirects to mappings error page', async () => {
      await uptimeService.common.hasMappingsError();
    });
  });
};
