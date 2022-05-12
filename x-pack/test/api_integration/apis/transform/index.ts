/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { FtrProviderContext } from '../../ftr_provider_context';

export default function ({ getService, loadTestFile }: FtrProviderContext) {
  const esArchiver = getService('esArchiver');
  const transform = getService('transform');

  describe('transform', function () {
    this.tags(['transform']);

    before(async () => {
      await transform.securityCommon.createTransformRoles();
      await transform.securityCommon.createTransformUsers();
    });

    after(async () => {
      await transform.securityCommon.cleanTransformUsers();
      await transform.securityCommon.cleanTransformRoles();

      await esArchiver.unload('x-pack/test/functional/es_archives/ml/farequote');

      await transform.testResources.resetKibanaTimeZone();
    });

    loadTestFile(require.resolve('./delete_transforms'));
    loadTestFile(require.resolve('./reset_transforms'));
    loadTestFile(require.resolve('./start_transforms'));
    loadTestFile(require.resolve('./stop_transforms'));
    loadTestFile(require.resolve('./transforms'));
    loadTestFile(require.resolve('./transforms_nodes'));
    loadTestFile(require.resolve('./transforms_preview'));
    loadTestFile(require.resolve('./transforms_stats'));
    loadTestFile(require.resolve('./transforms_update'));
    loadTestFile(require.resolve('./transforms_create'));
  });
}
