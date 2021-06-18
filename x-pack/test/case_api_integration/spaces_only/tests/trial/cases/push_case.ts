/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/* eslint-disable @typescript-eslint/naming-convention */

import expect from '@kbn/expect';
import { FtrProviderContext } from '../../../../common/ftr_provider_context';
import { ObjectRemover as ActionsRemover } from '../../../../../alerting_api_integration/common/lib';

import { nullUser } from '../../../../common/lib/mock';
import {
  pushCase,
  deleteAllCaseItems,
  createCaseWithConnector,
  getAuthWithSuperUser,
} from '../../../../common/lib/utils';
import {
  ExternalServiceSimulator,
  getExternalServiceSimulatorPath,
} from '../../../../../alerting_api_integration/common/fixtures/plugins/actions_simulators/server/plugin';

// eslint-disable-next-line import/no-default-export
export default ({ getService }: FtrProviderContext): void => {
  const supertest = getService('supertest');
  const kibanaServer = getService('kibanaServer');
  const es = getService('es');
  const authSpace1 = getAuthWithSuperUser();

  describe('push_case', () => {
    const actionsRemover = new ActionsRemover(supertest);

    let servicenowSimulatorURL: string = '<could not determine kibana url>';
    before(() => {
      servicenowSimulatorURL = kibanaServer.resolveUrl(
        getExternalServiceSimulatorPath(ExternalServiceSimulator.SERVICENOW)
      );
    });

    afterEach(async () => {
      await deleteAllCaseItems(es);
      await actionsRemover.removeAll();
    });

    it('should push a case in space1', async () => {
      const { postedCase, connector } = await createCaseWithConnector({
        supertest,
        servicenowSimulatorURL,
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

      // external_url is of the form http://elastic:changeme@localhost:5620 which is different between various environments like Jekins
      expect(
        external_url.includes(
          'api/_actions-FTS-external-service-simulators/servicenow/nav_to.do?uri=incident.do?sys_id=123'
        )
      ).to.equal(true);
    });

    it('should not push a case in a different space', async () => {
      const { postedCase, connector } = await createCaseWithConnector({
        supertest,
        servicenowSimulatorURL,
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
