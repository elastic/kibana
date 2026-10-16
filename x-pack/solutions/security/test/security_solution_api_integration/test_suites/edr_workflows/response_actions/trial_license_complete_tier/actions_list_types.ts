/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Client } from '@elastic/elasticsearch';
import expect from '@kbn/expect';
import { BASE_ENDPOINT_ACTION_ROUTE } from '@kbn/security-solution-plugin/common/endpoint/constants';
import {
  deleteIndexedEndpointAndFleetActions,
  indexEndpointAndFleetActionsForHost,
  type IndexedEndpointAndFleetActionsForHostResponse,
} from '@kbn/security-solution-plugin/common/endpoint/data_loaders/index_endpoint_fleet_actions';
import type { IndexedHostsAndAlertsResponse } from '@kbn/security-solution-plugin/common/endpoint/index_data';
import type { ActionListApiResponse } from '@kbn/security-solution-plugin/common/endpoint/types';
import type TestAgent from 'supertest/lib/agent';
import type { FtrProviderContext } from '../../../../ftr_provider_context_edr_workflows';
import { createSupertestErrorLogger } from '../../utils';

export default function ({ getService }: FtrProviderContext) {
  const endpointTestResources = getService('endpointTestResources');
  const es = getService('es');
  const log = getService('log');
  const utils = getService('securitySolutionUtils');

  // @skipInServerlessMKI - this test uses internal index manipulation in before/after hooks
  describe('@ess @serverless @skipInServerlessMKI Endpoint action list types filter', function () {
    let adminSupertest: TestAgent;
    let indexedData: IndexedHostsAndAlertsResponse;
    let automatedActions: IndexedEndpointAndFleetActionsForHostResponse;
    let agentId = '';

    const isAutomated = (action: ActionListApiResponse['data'][number]): boolean =>
      Boolean(action.alertIds?.length);

    const belongsToSeededHost = (action: ActionListApiResponse['data'][number]): boolean =>
      action.agents.includes(agentId);

    const fetchActions = async (
      query: Record<string, string | number | string[]> = {}
    ): Promise<ActionListApiResponse['data']> => {
      const { body } = await adminSupertest
        .get(BASE_ENDPOINT_ACTION_ROUTE)
        .set('kbn-xsrf', 'true')
        .set('elastic-api-version', '2023-10-31')
        .set('x-elastic-internal-origin', 'kibana')
        .query({ pageSize: 100, ...query })
        .on('error', createSupertestErrorLogger(log))
        .expect(200);

      return (body as ActionListApiResponse).data.filter(belongsToSeededHost);
    };

    before(async () => {
      adminSupertest = await utils.createSuperTest();
      indexedData = await endpointTestResources.loadEndpointData({
        waitUntilTransformed: false,
      });
      agentId = indexedData.hosts[0].agent.id;
      automatedActions = await indexEndpointAndFleetActionsForHost(
        es as Client,
        indexedData.hosts[0],
        {
          numResponseActions: 1,
          alertIds: ['automated-alert-id'],
        }
      );
    });

    after(async () => {
      if (automatedActions) {
        await deleteIndexedEndpointAndFleetActions(es as Client, automatedActions).catch(
          (error) => {
            log.warning(`automated actions cleanup threw error: ${error.message}`);
          }
        );
      }
      if (indexedData) {
        await endpointTestResources.unloadEndpointData(indexedData).catch((error) => {
          log.warning(`afterAll data clean up threw error: ${error.message}`);
        });
      }
    });

    it('returns both manual and automated actions when types is omitted', async () => {
      const data = await fetchActions();

      expect(data).to.have.length(2);
      expect(data.some(isAutomated)).to.eql(true);
      expect(data.some((action) => !isAutomated(action))).to.eql(true);
    });

    it('returns only automated actions when types is automated', async () => {
      const data = await fetchActions({ types: 'automated' });

      expect(data).to.have.length(1);
      expect(isAutomated(data[0])).to.eql(true);
      expect(data[0].alertIds).to.eql(['automated-alert-id']);
    });

    it('returns only manual actions when types is manual', async () => {
      const data = await fetchActions({ types: 'manual' });

      expect(data).to.have.length(1);
      expect(data.every((action) => !isAutomated(action))).to.eql(true);
    });

    it('returns both when types includes automated and manual', async () => {
      const unfiltered = await fetchActions();
      const data = await fetchActions({ types: ['automated', 'manual'] });

      expect(data).to.have.length(2);
      expect(data.length).to.eql(unfiltered.length);
      expect(data.some(isAutomated)).to.eql(true);
      expect(data.some((action) => !isAutomated(action))).to.eql(true);
    });
  });
}
