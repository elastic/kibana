/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { FtrProviderContext } from '../../../ftr_provider_context';

export default ({ getPageObjects, getService }: FtrProviderContext) => {
  const pageObjects = getPageObjects(['common', 'roleMappings']);
  const testSubjects = getService('testSubjects');

  describe('Role Mappings', function() {
    before(async () => {
      await pageObjects.common.navigateToApp('settings');
    });

    it('does not render the Role Mappings UI under the basic license', async () => {
      await testSubjects.missingOrFail('roleMappings');
    });
  });
};
