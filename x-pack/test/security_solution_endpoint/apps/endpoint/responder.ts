/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { IndexedHostsAndAlertsResponse } from '@kbn/security-solution-plugin/common/endpoint/index_data';
import { TimelineResponse } from '@kbn/security-solution-plugin/common/types';
import { FtrProviderContext } from '../../ftr_provider_context';
import { DATE_RANGE_OPTION_TO_TEST_SUBJ_MAP } from '../../../security_solution_ftr/page_objects/helpers/super_date_picker';

export default ({ getPageObjects, getService }: FtrProviderContext) => {
  const pageObjects = getPageObjects([
    'common',
    'endpoint',
    'header',
    'endpointPageUtils',
    'responder',
    'timeline',
    'detections',
  ]);
  const testSubjects = getService('testSubjects');
  const endpointTestResources = getService('endpointTestResources');
  const timelineTestService = getService('timeline');
  const detectionsTestService = getService('detections');
  const log = getService('log');

  // The Alerts Rule seems to run every 5 minutes when there are no failures. This timeout ensures
  // that we wait long enough for them to show up.
  const MAX_WAIT_FOR_ALERTS_TIMEOUT = 60_000 * 10;

  const performResponderSanityChecks = async () => {
    // Show the Action log
    await pageObjects.responder.openActionLogFlyout();

    // Ensure the popover in the action log date quick select picker is accessible
    // (this is especially important for when Responder is displayed from a Timeline)
    await pageObjects.responder.clickActionLogSuperDatePickerQuickMenuButton();
    await testSubjects.click(DATE_RANGE_OPTION_TO_TEST_SUBJ_MAP['Last 1 year']);
    await pageObjects.responder.closeActionLogFlyout();

    // Close responder
    await pageObjects.responder.closeResponder();
  };
  const getEndpointAlertsQueryForAgentId = (
    agentId: string
  ): object & { $stringify: () => string } => {
    return Object.assign(
      Object.create({
        $stringify() {
          return JSON.stringify(this);
        },
      }),

      {
        bool: {
          filter: [
            {
              bool: {
                should: [{ match_phrase: { 'agent.type': 'endpoint' } }],
                minimum_should_match: 1,
              },
            },
            {
              bool: {
                should: [{ match_phrase: { 'agent.id': agentId } }],
                minimum_should_match: 1,
              },
            },
            {
              bool: {
                should: [{ exists: { field: 'kibana.alert.rule.uuid' } }],
                minimum_should_match: 1,
              },
            },
          ],
        },
      }
    );
  };

  describe('Response Actions Responder', function () {
    let indexedData: IndexedHostsAndAlertsResponse;
    let endpointAgentId: string;

    before(async () => {
      indexedData = await endpointTestResources.loadEndpointData({
        numHosts: 2,
        generatorSeed: `responder ${Math.random()}`,
      });

      endpointAgentId = indexedData.hosts[0].agent.id;

      // start/stop the endpoint rule. This should cause the rule to run immediately
      // and create the Alerts and avoid us having to wait for the interval (of 5 minutes)
      await detectionsTestService.stopStartEndpointRule();
    });

    after(async () => {
      if (indexedData) {
        log.info('Cleaning up loaded endpoint data');
        await endpointTestResources.unloadEndpointData(indexedData);
      }
    });

    describe('from the Endpoint list and details', () => {
      before(async () => {
        await pageObjects.endpoint.navigateToEndpointList();
      });

      it('should show Responder from the endpoint list', async () => {
        await pageObjects.endpoint.showResponderFromEndpointList(endpointAgentId);
        await performResponderSanityChecks();
      });

      it('should show Responder from the endpoint details', async () => {
        await pageObjects.endpoint.showResponderFromEndpointDetails(endpointAgentId);
        await performResponderSanityChecks();
      });
    });

    describe('from timeline', () => {
      let timeline: TimelineResponse;

      before(async () => {
        timeline = await timelineTestService.createTimeline('endpoint responder test');

        // Add all alerts for the Endpoint to the timeline created
        timeline = await timelineTestService.updateTimeline(
          timeline.data.persistTimeline.timeline.savedObjectId,
          {
            title: timeline.data.persistTimeline.timeline.title,
            kqlQuery: {
              filterQuery: {
                kuery: {
                  kind: 'kuery',
                  expression: `agent.type: "endpoint" AND agent.id : "${endpointAgentId}" AND kibana.alert.rule.uuid : *`,
                },
                serializedQuery: getEndpointAlertsQueryForAgentId(endpointAgentId).$stringify(),
              },
            },
          },
          timeline.data.persistTimeline.timeline.version
        );

        await detectionsTestService.waitForAlerts(
          getEndpointAlertsQueryForAgentId(endpointAgentId),
          MAX_WAIT_FOR_ALERTS_TIMEOUT
        );

        await pageObjects.timeline.navigateToTimelineList();
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

      it('should show Responder from alert in a timeline', async () => {
        await pageObjects.timeline.openTimelineById(
          timeline.data.persistTimeline.timeline.savedObjectId
        );
        await pageObjects.timeline.setDateRange('Last 1 year');
        await pageObjects.timeline.waitForEvents(60_000);

        // Show event/alert details for the first one in the list
        await pageObjects.timeline.showEventDetails();

        // Click responder from the take action button
        await testSubjects.click('take-action-dropdown-btn');
        await testSubjects.clickWhenNotDisabled('endpointResponseActions-action-item');
        await testSubjects.existOrFail('consolePageOverlay');

        await performResponderSanityChecks();

        await pageObjects.timeline.closeTimeline();
      });
    });

    describe('from alerts', () => {
      before(async () => {
        await detectionsTestService.waitForAlerts(
          getEndpointAlertsQueryForAgentId(endpointAgentId),
          MAX_WAIT_FOR_ALERTS_TIMEOUT
        );
      });

      it('should show Responder from alert details under alerts list page', async () => {
        const hostname = indexedData.hosts[0].host.name;
        await pageObjects.detections.navigateToAlerts(
          `query=(language:kuery,query:'host.hostname: "${hostname}" ')`
        );
        await pageObjects.detections.waitForListToHaveAlerts();
        await pageObjects.detections.openFirstAlertDetailsForHostName(hostname);
        await pageObjects.detections.openResponseConsoleFromAlertDetails();
        await performResponderSanityChecks();
      });
    });
  });
};
