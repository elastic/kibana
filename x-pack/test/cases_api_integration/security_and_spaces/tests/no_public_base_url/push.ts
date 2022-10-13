/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import { FtrProviderContext } from '../../../common/ftr_provider_context';
import { ObjectRemover as ActionsRemover } from '../../../../alerting_api_integration/common/lib';

import {
  pushCase,
  deleteAllCaseItems,
  createCaseWithConnector,
  getRecordingServiceNowSimulatorServer,
} from '../../../common/lib/utils';
import { RecordingServiceNowSimulator } from '../../../../alerting_api_integration/common/fixtures/plugins/actions_simulators/server/servicenow_simulation';

// eslint-disable-next-line import/no-default-export
export default ({ getService }: FtrProviderContext): void => {
  const supertest = getService('supertest');
  const es = getService('es');

  describe('push_case', () => {
    describe('incident recorder server', () => {
      const actionsRemover = new ActionsRemover(supertest);
      let serviceNowSimulatorURL: string = '';
      let serviceNowServer: RecordingServiceNowSimulator;

      beforeEach(async () => {
        const { server, url } = await getRecordingServiceNowSimulatorServer();
        serviceNowServer = server;
        serviceNowSimulatorURL = url;
      });

      afterEach(async () => {
        await deleteAllCaseItems(es);
        await actionsRemover.removeAll();
        serviceNowServer.close();
      });

      it('should push correctly without a publicBaseUrl', async () => {
        const { postedCase, connector } = await createCaseWithConnector({
          supertest,
          serviceNowSimulatorURL,
          actionsRemover,
        });

        await pushCase({
          supertest,
          caseId: postedCase.id,
          connectorId: connector.id,
        });

        expect(serviceNowServer.incident).eql({
          short_description: postedCase.title,
          description: `${postedCase.description}\n\nAdded by elastic.`,
          severity: '2',
          urgency: '2',
          impact: '2',
          category: 'software',
          subcategory: 'os',
          correlation_id: postedCase.id,
          correlation_display: 'Elastic Case',
          caller_id: 'admin',
          opened_by: 'admin',
        });
      });
    });
  });
};
