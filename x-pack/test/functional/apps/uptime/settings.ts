/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import expect from '@kbn/expect';
import { FtrProviderContext } from '../../ftr_provider_context';
import { DYNAMIC_SETTINGS_DEFAULTS } from '../../../../legacy/plugins/uptime/common/constants';
import { DynamicSettings } from '../../../../legacy/plugins/uptime/common/runtime_types';
import { makeChecks } from '../../../api_integration/apis/uptime/rest/helper/make_checks';

export default ({ getPageObjects, getService }: FtrProviderContext) => {
  const { uptime: uptimePage } = getPageObjects(['uptime']);
  const uptimeService = getService('uptime');

  const es = getService('es');

  // Flaky https://github.com/elastic/kibana/issues/60866
  describe('uptime settings page', () => {
    beforeEach('navigate to clean app root', async () => {
      // make 10 checks
      await makeChecks(es, 'myMonitor', 1, 1, 1);
      await uptimePage.goToRoot();
    });

    it('loads the default settings', async () => {
      const settings = uptimeService.settings;

      await settings.go();

      const fields = await settings.loadFields();
      expect(fields).to.eql(DYNAMIC_SETTINGS_DEFAULTS);
    });

    it('should disable the apply button when invalid or unchanged', async () => {
      const settings = uptimeService.settings;

      await settings.go();

      // Disabled because it's the original value
      expect(await settings.applyButtonIsDisabled()).to.eql(true);

      // Enabled because it's a new, different, value
      await settings.changeHeartbeatIndicesInput('somethingNew');
      expect(await settings.applyButtonIsDisabled()).to.eql(false);

      // Disabled because it's blank
      await settings.changeHeartbeatIndicesInput('');
      expect(await settings.applyButtonIsDisabled()).to.eql(true);
    });

    // Failing: https://github.com/elastic/kibana/issues/60863
    it('changing index pattern setting is reflected elsewhere in UI', async () => {
      const settings = uptimeService.settings;

      const originalCount = await uptimePage.getSnapshotCount();
      // We should find 1 monitor up with the default index pattern
      expect(originalCount.up).to.eql(1);

      await settings.go();

      const newFieldValues: DynamicSettings = {
        heartbeatIndices: 'new*',
        certThresholds: {
          age: 365,
          expiration: 30,
        },
      };
      await settings.changeHeartbeatIndicesInput(newFieldValues.heartbeatIndices);
      await settings.apply();

      await uptimePage.goToRoot();

      // We should no longer find any monitors since the new pattern matches nothing
      await uptimePage.pageHasDataMissing();

      // Verify that the settings page shows the value we previously saved
      await settings.go();
      const fields = await settings.loadFields();
      expect(fields.heartbeatIndices).to.eql(newFieldValues.heartbeatIndices);
    });

    it('changing certificate expiration error threshold is reflected in settings page', async () => {
      const settings = uptimeService.settings;

      await settings.go();

      const newErrorThreshold = '5';
      await settings.changeErrorThresholdInput(newErrorThreshold);
      await settings.apply();

      await uptimePage.goToRoot();

      // Verify that the settings page shows the value we previously saved
      await settings.go();
      const fields = await settings.loadFields();
      expect(fields.certThresholds?.expiration).to.eql(newErrorThreshold);
    });

    it('changing certificate expiration warning threshold is reflected in settings page', async () => {
      const settings = uptimeService.settings;

      await settings.go();

      const newWarningThreshold = '15';
      await settings.changeWarningThresholdInput(newWarningThreshold);
      await settings.apply();

      await uptimePage.goToRoot();

      // Verify that the settings page shows the value we previously saved
      await settings.go();
      const fields = await settings.loadFields();
      expect(fields.certThresholds?.age).to.eql(newWarningThreshold);
    });
  });
};
