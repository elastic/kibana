/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import expect from '@kbn/expect';
import { FtrProviderContext } from '../../ftr_provider_context';
import {
  defaultDynamicSettings,
  DynamicSettings,
} from '../../../../legacy/plugins/uptime/common/runtime_types/dynamic_settings';
import {
  settingsObjectId,
  settingsObjectType,
} from '../../../../plugins/uptime/server/lib/saved_objects';
import { makeChecks } from '../../../api_integration/apis/uptime/graphql/helpers/make_checks';

export default ({ getPageObjects, getService }: FtrProviderContext) => {
  const pageObjects = getPageObjects(['uptime']);
  const server = getService('kibanaServer');
  const es = getService('es');

  describe('uptime settings page', () => {
    beforeEach('navigate to clean app root', async () => {
      // make 10 checks
      await makeChecks(es, 'myMonitor', 1, 1, 1);
      // delete the saved object
      await server.savedObjects.delete({
        type: settingsObjectType,
        id: settingsObjectId,
      });

      await pageObjects.uptime.goToRoot();
    });

    const settingsPage = pageObjects.uptime.settings;

    it('loads the default settings', async () => {
      await pageObjects.uptime.settings.go();

      const fields = await settingsPage.loadFields();
      expect(fields).to.eql(defaultDynamicSettings);
    });

    it('should disable the apply button when invalid or unchanged', async () => {
      await pageObjects.uptime.settings.go();

      // Disabled because it's the original value
      expect(await settingsPage.applyButtonIsDisabled()).to.eql(true);

      // Enabled because it's a new, different, value
      await settingsPage.changeHeartbeatIndicesInput('somethingNew');
      expect(await settingsPage.applyButtonIsDisabled()).to.eql(false);

      // Disabled because it's blank
      await settingsPage.changeHeartbeatIndicesInput('');
      expect(await settingsPage.applyButtonIsDisabled()).to.eql(true);
    });

    it('changing index pattern setting is reflected elsewhere in UI', async () => {
      const originalCount = await pageObjects.uptime.getSnapshotCount();
      // We should find 1 monitor up with the default index pattern
      expect(originalCount.up).to.eql(1);

      await pageObjects.uptime.settings.go();

      const newFieldValues: DynamicSettings = { heartbeatIndices: 'new*' };
      await settingsPage.changeHeartbeatIndicesInput(newFieldValues.heartbeatIndices);
      await settingsPage.apply();

      await pageObjects.uptime.goToRoot();

      // We should no longer find any monitors since the new pattern matches nothing
      await pageObjects.uptime.pageHasDataMissing();

      // Verify that the settings page shows the value we previously saved
      await pageObjects.uptime.settings.go();
      const fields = await settingsPage.loadFields();
      expect(fields).to.eql(newFieldValues);
    });
  });
};
