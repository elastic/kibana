/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { FtrProviderContext } from '../../../ftr_provider_context';
import { ObjectRemover } from '../../../lib/object_remover';
import { generateUniqueKey } from '../../../lib/get_test_data';
import { createMaintenanceWindow, createObjectRemover } from '../maintenance_windows/utils';

export default ({ getPageObjects, getService }: FtrProviderContext) => {
  const testSubjects = getService('testSubjects');
  const pageObjects = getPageObjects(['common']);

  let objectRemover: ObjectRemover;
  const browser = getService('browser');

  describe('Maintenance windows banner', () => {
    before(async () => {
      objectRemover = await createObjectRemover({ getService });
    });

    after(async () => {
      await objectRemover.removeAll();
    });

    it('should not show a maintenance window banner', async () => {
      await pageObjects.common.navigateToApp('triggersActions');
      await testSubjects.click('rulesTab');
      await testSubjects.missingOrFail('maintenanceWindow');
    });

    it('should show a maintenance window banner', async () => {
      await pageObjects.common.navigateToApp('maintenanceWindows');
      const name = generateUniqueKey();
      const createdMaintenanceWindow = await createMaintenanceWindow({
        name,
        getService,
      });
      objectRemover.add(createdMaintenanceWindow.id, 'rules/maintenance_window', 'alerting', true);
      await browser.refresh();

      await pageObjects.common.navigateToApp('triggersActions');
      await testSubjects.click('rulesTab');
      await testSubjects.existOrFail('maintenanceWindow');
    });
  });
};
