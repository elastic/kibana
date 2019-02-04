/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { KibanaFunctionalTestDefaultProviders } from '../../types/providers';

export const UptimePageProvider = ({
  getPageObjects,
  getService,
}: KibanaFunctionalTestDefaultProviders) => {
  const pageObject = getPageObjects(['common']);
  const uptimeService = getService('uptime');

  return {
    async goToUptimeOverview() {
      await pageObject.common.navigateToApp('uptime');
      await uptimeService.assertExists();
    },
  };
};
