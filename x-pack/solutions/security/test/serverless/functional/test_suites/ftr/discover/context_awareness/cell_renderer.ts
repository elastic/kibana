/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import { ELASTIC_HTTP_VERSION_HEADER } from '@kbn/core-http-common';
import {
  INITIALIZATION_FLOW_SECURITY_DATA_VIEWS,
  INITIALIZATION_FLOW_STATUS_READY,
  INITIALIZE_SECURITY_SOLUTION_URL,
} from '@kbn/security-solution-plugin/common/api/initialization';
import type { FtrProviderContext } from '../../../../ftr_provider_context';
import { getDiscoverESQLState, TEST_RULE_NAME } from './utils';
import { SECURITY_SOLUTION_DATA_VIEW } from '../../../constants';

export default function ({ getService, getPageObjects }: FtrProviderContext) {
  const PageObjects = getPageObjects(['common', 'timePicker', 'discover', 'svlCommonPage']);
  const testSubjects = getService('testSubjects');
  const queryBar = getService('queryBar');
  const roleScopedSupertest = getService('roleScopedSupertest');

  describe('cell renderer', () => {
    before(async () => {
      await PageObjects.svlCommonPage.loginWithRole('platform_engineer');

      // Loading the Security app only creates the "Security solution default" data view as an
      // unawaited side effect, which the ES|QL test cut short by navigating to Discover.
      const adminSupertest = await roleScopedSupertest.getSupertestWithRoleScope('admin', {
        useCookieHeader: true,
        withInternalHeaders: true,
      });
      const { body } = await adminSupertest
        .post(INITIALIZE_SECURITY_SOLUTION_URL)
        .set(ELASTIC_HTTP_VERSION_HEADER, '2023-10-31')
        .send({ flows: [INITIALIZATION_FLOW_SECURITY_DATA_VIEWS] })
        .expect(200);
      expect(body.flows[INITIALIZATION_FLOW_SECURITY_DATA_VIEWS]).to.have.property(
        'status',
        INITIALIZATION_FLOW_STATUS_READY
      );
    });

    describe('ES|QL mode', () => {
      it('should render alert workflow status badge', async () => {
        const state = getDiscoverESQLState(
          `from .alerts-security.alerts-default | WHERE host.name == "siem-kibana" and event.kind == "signal" and kibana.alert.rule.name == "${TEST_RULE_NAME}"`
        );
        await PageObjects.common.navigateToActualUrl('discover', `?_a=${state}`, {
          ensureCurrentUrl: false,
        });
        await PageObjects.discover.waitUntilSearchingHasFinished();
        await PageObjects.discover.waitForDocTableLoadingComplete();
        const alertWorkflowStatus = await testSubjects.findAll('rule-status-badge', 2500);
        expect(alertWorkflowStatus).to.have.length(1);
      });
    });

    describe('DataView mode', () => {
      it('should render alert workflow status badge', async () => {
        await PageObjects.discover.navigateToApp({ queryMode: 'classic' });
        await PageObjects.discover.selectIndexPattern(SECURITY_SOLUTION_DATA_VIEW);
        await queryBar.setQuery(
          `host.name: "siem-kibana" AND event.kind: "signal" AND kibana.alert.rule.name: "${TEST_RULE_NAME}"`
        );
        await queryBar.clickQuerySubmitButton();
        await PageObjects.discover.waitUntilSearchingHasFinished();
        const alertWorkflowStatus = await testSubjects.findAll('rule-status-badge', 2500);
        expect(alertWorkflowStatus).to.have.length(1);
      });
    });
  });
}
