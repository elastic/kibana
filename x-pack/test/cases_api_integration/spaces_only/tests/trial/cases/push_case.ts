/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/* eslint-disable @typescript-eslint/naming-convention */
import http from 'http';
import expect from '@kbn/expect';
import { FtrProviderContext } from '../../../../common/ftr_provider_context';
import { ObjectRemover as ActionsRemover } from '../../../../../alerting_api_integration/common/lib';

import { nullUser } from '../../../../common/lib/mock';
import {
  pushCase,
  deleteAllCaseItems,
  createCaseWithConnector,
  getAuthWithSuperUser,
  getServiceNowSimulationServer,
} from '../../../../common/lib/utils';

// eslint-disable-next-line import/no-default-export
export default ({ getService }: FtrProviderContext): void => {
  const supertest = getService('supertest');
  const es = getService('es');
  const authSpace1 = getAuthWithSuperUser();

  describe('push_case', () => {
    const actionsRemover = new ActionsRemover(supertest);
    let serviceNowSimulatorURL: string = '';
    let serviceNowServer: http.Server;

    before(async () => {
      const { server, url } = await getServiceNowSimulationServer();
      serviceNowServer = server;
      serviceNowSimulatorURL = url;
    });

    afterEach(async () => {
      await deleteAllCaseItems(es);
      await actionsRemover.removeAll();
    });

    after(async () => {
      serviceNowServer.close();
    });

    it('should push a case in space1', async () => {
      const { postedCase, connector } = await createCaseWithConnector({
        supertest,
        serviceNowSimulatorURL,
        actionsRemover,
        auth: authSpace1,
      });
      const theCase = await pushCase({
        supertest,
        caseId: postedCase.id,
        connectorId: connector.id,
        auth: authSpace1,
      });

      const { pushed_at, external_url, ...rest } = theCase.external_service!;

      expect(rest).to.eql({
        pushed_by: nullUser,
        connector_id: connector.id,
        connector_name: connector.name,
        external_id: '123',
        external_title: 'INC01',
      });

      expect(external_url.includes('nav_to.do?uri=incident.do?sys_id=123')).to.equal(true);
    });

    it('should not push a case in a different space', async () => {
      const { postedCase, connector } = await createCaseWithConnector({
        supertest,
        serviceNowSimulatorURL,
        actionsRemover,
        auth: authSpace1,
      });
      await pushCase({
        supertest,
        caseId: postedCase.id,
        connectorId: connector.id,
        auth: getAuthWithSuperUser('space2'),
        expectedHttpCode: 404,
      });
    });
  });
};
