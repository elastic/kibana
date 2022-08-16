/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { FtrProviderContext } from '../../ftr_provider_context';

export default function ({ getService, loadTestFile }: FtrProviderContext) {
  const esArchiver = getService('esArchiver');
  const cloudPosture = getService('transform');

  describe('cloud_security_posture', function () {
    this.tags(['cloud_security_posture']);

    before(async () => {
      await cloudPosture.securityCommon.createTransformRoles();
      await cloudPosture.securityCommon.createTransformUsers();
    });

    after(async () => {
      await cloudPosture.securityCommon.cleanTransformUsers();
      await cloudPosture.securityCommon.cleanTransformRoles();
      await esArchiver.unload('x-pack/test/functional/es_archives/ml/farequote');
      await cloudPosture.testResources.resetKibanaTimeZone();
    });

    loadTestFile(require.resolve('./update_rules_config'));
  });
}
