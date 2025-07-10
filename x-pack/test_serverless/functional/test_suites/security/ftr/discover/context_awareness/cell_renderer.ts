/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import { FtrProviderContext } from '../../../../../ftr_provider_context';
import { getDiscoverESQLState } from './utils';
import { SECURITY_SOLUTION_DATA_VIEW, SECURITY_SOLUTION_INDEX_PATTERN } from '../../../constants';

export default function ({ getService, getPageObjects }: FtrProviderContext) {
  const PageObjects = getPageObjects(['common', 'timePicker', 'discover', 'svlCommonPage']);
  const testSubjects = getService('testSubjects');
  const queryBar = getService('queryBar');

  describe('cell renderer', () => {
    before(async () => {
      await PageObjects.svlCommonPage.loginWithRole('platform_engineer');
      await PageObjects.common.navigateToApp('security', {
        path: 'alerts',
      });
    });

    describe('ES|QL mode', () => {
      it('should render alert workflow status badge', async () => {
        const state = getDiscoverESQLState(
          `from ${SECURITY_SOLUTION_INDEX_PATTERN} | WHERE host.name == "siem-kibana" and event.kind != "signal"`
        );
        await PageObjects.common.navigateToActualUrl('discover', `?_a=${state}`, {
          ensureCurrentUrl: false,
        });
        await PageObjects.discover.waitUntilSearchingHasFinished();
        const alertWorkflowStatus = await testSubjects.findAll('rule-status-badge', 2500);
        expect(alertWorkflowStatus).to.have.length(1);
      });
    });

    describe('DataView mode', () => {
      it('should render alert workflow status badge', async () => {
        await PageObjects.common.navigateToActualUrl('discover', undefined, {
          ensureCurrentUrl: false,
        });
        await PageObjects.discover.selectIndexPattern(SECURITY_SOLUTION_DATA_VIEW);
        await queryBar.setQuery('host.name: "siem-kibana" AND event.kind: "signal"');
        await queryBar.clickQuerySubmitButton();
        await PageObjects.discover.waitUntilSearchingHasFinished();
        const alertWorkflowStatus = await testSubjects.findAll('rule-status-badge', 2500);
        expect(alertWorkflowStatus).to.have.length(1);
      });
    });
  });
}
