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
} from '../../../../legacy/plugins/uptime/common/runtime_types';
import { makeChecks } from '../../../api_integration/apis/uptime/graphql/helpers/make_checks';

export default ({ getPageObjects, getService }: FtrProviderContext) => {
  const { uptime } = getPageObjects(['uptime']);
  const { settings } = getService('uptime');

  const es = getService('es');

  // Flaky https://github.com/elastic/kibana/issues/60866
  describe('uptime settings page', () => {
    const settingsPage = () => settings;
    beforeEach('navigate to clean app root', async () => {
      // make 10 checks
      await makeChecks(es, 'myMonitor', 1, 1, 1);
      await uptime.goToRoot();
    });

    it('loads the default settings', async () => {
      await settings.go();

      const fields = await settingsPage().loadFields();
      expect(fields).to.eql(defaultDynamicSettings);
    });

    it('should disable the apply button when invalid or unchanged', async () => {
      await settings.go();

      // Disabled because it's the original value
      expect(await settingsPage().applyButtonIsDisabled()).to.eql(true);

      // Enabled because it's a new, different, value
      await settingsPage().changeHeartbeatIndicesInput('somethingNew');
      expect(await settingsPage().applyButtonIsDisabled()).to.eql(false);

      // Disabled because it's blank
      await settingsPage().changeHeartbeatIndicesInput('');
      expect(await settingsPage().applyButtonIsDisabled()).to.eql(true);
    });

    // Failing: https://github.com/elastic/kibana/issues/60863
    it('changing index pattern setting is reflected elsewhere in UI', async () => {
      const originalCount = await uptime.getSnapshotCount();
      // We should find 1 monitor up with the default index pattern
      expect(originalCount.up).to.eql(1);

      await settings.go();

      const newFieldValues: DynamicSettings = { heartbeatIndices: 'new*' };
      await settingsPage().changeHeartbeatIndicesInput(newFieldValues.heartbeatIndices);
      await settingsPage().apply();

      await uptime.goToRoot();

      // We should no longer find any monitors since the new pattern matches nothing
      await uptime.pageHasDataMissing();

      // Verify that the settings page shows the value we previously saved
      await settings.go();
      const fields = await settingsPage().loadFields();
      expect(fields).to.eql(newFieldValues);
    });
  });
};
