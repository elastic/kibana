/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { FtrProviderContext } from '../../ftr_provider_context';

export default function ({ getService }: FtrProviderContext) {
  // eslint-disable-next-line ban/ban
  describe.only('serverless search UI', function () {
    const esArchiver = getService('esArchiver');

    before(async () => {
      await esArchiver.emptyKibanaIndex();
    });

    it('should fail to run due to esArchiver.emptyKibanaIndex() throwing an exception', () => {
      // eslint-disable-next-line no-console
      console.log("I'm a failure!");
    });
  });
}
