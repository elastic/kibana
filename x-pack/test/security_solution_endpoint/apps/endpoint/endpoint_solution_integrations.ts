/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { IndexedHostsAndAlertsResponse } from '@kbn/security-solution-plugin/common/endpoint/index_data';
import { TimelineResponse } from '@kbn/security-solution-plugin/common/api/timeline';
// @ts-expect-error we have to check types with "allowJs: false" for now, causing this import to fail
import { kibanaPackageJson } from '@kbn/repo-info';
import { type IndexedEndpointRuleAlerts } from '@kbn/security-solution-plugin/common/endpoint/data_loaders/index_endpoint_rule_alerts';
import { FtrProviderContext } from '../../configs/ftr_provider_context';
import { targetTags } from '../../target_tags';

/**
 * Test suite is meant to cover usages of endpoint functionality or access to endpoint
 * functionality from other areas of security solution.
 */
export default ({ getPageObjects, getService }: FtrProviderContext) => {
  const endpointService = getService('endpointTestResources');
  const timelineTestService = getService('timeline');
  const detectionsTestService = getService('detections');
  const log = getService('log');
  const testSubjects = getService('testSubjects');
  const pageObjects = getPageObjects(['common', 'timeline']);

  describe('App level Endpoint functionality', function () {
    targetTags(this, ['@ess']);

    let indexedData: IndexedHostsAndAlertsResponse;
    let indexedAlerts: IndexedEndpointRuleAlerts;
    let endpointAgentId: string;

    before(async () => {
      indexedData = await endpointService.loadEndpointData({
        numHosts: 2,
        generatorSeed: `app-level-endpoint-${Math.random()}`,
      });

      endpointAgentId = indexedData.hosts[0].agent.id;

      await endpointService.waitForUnitedEndpoints([endpointAgentId]);

      // Ensure our Endpoint is for current version of kibana
      await endpointService.sendEndpointMetadataUpdate(endpointAgentId, {
        agent: { version: kibanaPackageJson.version },
      });

      // Load alerts for our endpoint (so that we don't have to wait for the rule to run)
      indexedAlerts = await detectionsTestService.loadEndpointRuleAlerts(endpointAgentId);
    });

    after(async () => {
      if (indexedData) {
        log.info('Cleaning up loaded endpoint data');
        await endpointService.unloadEndpointData(indexedData);
      }

      if (indexedAlerts) {
        await indexedAlerts.cleanup();
      }
    });

    // failing tests: https://github.com/elastic/kibana/issues/170705
    describe.skip('from Timeline', () => {
      let timeline: TimelineResponse;

      before(async () => {
        log.info(
          `Creating timeline for events from host: ${indexedData.hosts[0].host.hostname} (agent id: ${indexedData.hosts[0].agent.id})`
        );
        timeline = await timelineTestService.createTimelineForEndpointAlerts(
          'endpoint in timeline',
          {
            endpointAgentId,
          }
        );

        // wait for alerts to be available for the Endpoint ID
        await detectionsTestService.waitForAlerts(
          timelineTestService.getEndpointAlertsKqlQuery(endpointAgentId).esQuery,
          // The Alerts rules seems to run every 5 minutes, so we wait here a max
          // of 6 minutes to ensure it runs and completes and alerts are available.
          60_000 * 6
        );

        await pageObjects.timeline.navigateToTimelineList();
        await pageObjects.timeline.openTimelineById(
          timeline.data.persistTimeline.timeline.savedObjectId
        );
        await pageObjects.timeline.setDateRange('Last 1 year');
        await pageObjects.timeline.waitForEvents(60_000 * 2);
      });

      after(async () => {
        if (timeline) {
          log.info(
            `Cleaning up created timeline [${timeline.data.persistTimeline.timeline.title} - ${timeline.data.persistTimeline.timeline.savedObjectId}]`
          );
          await timelineTestService.deleteTimeline(
            timeline.data.persistTimeline.timeline.savedObjectId
          );
        }
      });

      it('should show Isolation action in alert details', async () => {
        await pageObjects.timeline.showEventDetails();
        await testSubjects.click('take-action-dropdown-btn');
        await testSubjects.clickWhenNotDisabled('isolate-host-action-item');
        await testSubjects.existOrFail('endpointHostIsolationForm');
        await testSubjects.click('hostIsolateCancelButton');
      });
    });
  });
};
