/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import http from 'http';
import expect from '@kbn/expect';
import { FtrProviderContext } from '../../../../common/ftr_provider_context';
import { ObjectRemover as ActionsRemover } from '../../../../../alerting_api_integration/common/lib';

import {
  getConfigurationRequest,
  removeServerGeneratedPropertiesFromSavedObject,
  getConfigurationOutput,
  deleteConfiguration,
  createConfiguration,
  updateConfiguration,
  getServiceNowConnector,
  createConnector,
  getAuthWithSuperUser,
  getActionsSpace,
  getServiceNowSimulationServer,
} from '../../../../common/lib/utils';
import { ConnectorTypes } from '../../../../../../plugins/cases/common/api';
import { nullUser } from '../../../../common/lib/mock';

// eslint-disable-next-line import/no-default-export
export default ({ getService }: FtrProviderContext): void => {
  const supertest = getService('supertest');
  const es = getService('es');
  const authSpace1 = getAuthWithSuperUser();
  const space = getActionsSpace(authSpace1.space);

  describe('patch_configure', () => {
    const actionsRemover = new ActionsRemover(supertest);
    let serviceNowSimulatorURL: string = '';
    let serviceNowServer: http.Server;

    before(async () => {
      const { server, url } = await getServiceNowSimulationServer();
      serviceNowServer = server;
      serviceNowSimulatorURL = url;
    });

    afterEach(async () => {
      await deleteConfiguration(es);
      await actionsRemover.removeAll();
    });

    after(async () => {
      serviceNowServer.close();
    });

    it('should patch a configuration connector and create mappings in space1', async () => {
      const connector = await createConnector({
        supertest,
        req: {
          ...getServiceNowConnector(),
          config: { apiUrl: serviceNowSimulatorURL },
        },
        auth: authSpace1,
      });

      actionsRemover.add(space, connector.id, 'action', 'actions');

      // Configuration is created with no connector so the mappings are empty
      const configuration = await createConfiguration(
        supertest,
        getConfigurationRequest(),
        200,
        authSpace1
      );

      // the update request doesn't accept the owner field
      const { owner, ...reqWithoutOwner } = getConfigurationRequest({
        id: connector.id,
        name: connector.name,
        type: connector.connector_type_id as ConnectorTypes,
        fields: null,
      });

      const newConfiguration = await updateConfiguration(
        supertest,
        configuration.id,
        {
          ...reqWithoutOwner,
          version: configuration.version,
        },
        200,
        authSpace1
      );

      const data = removeServerGeneratedPropertiesFromSavedObject(newConfiguration);
      expect(data).to.eql({
        ...getConfigurationOutput(true),
        created_by: nullUser,
        updated_by: nullUser,
        connector: {
          id: connector.id,
          name: connector.name,
          type: connector.connector_type_id as ConnectorTypes,
          fields: null,
        },
        mappings: [
          {
            action_type: 'overwrite',
            source: 'title',
            target: 'short_description',
          },
          {
            action_type: 'overwrite',
            source: 'description',
            target: 'description',
          },
          {
            action_type: 'append',
            source: 'comments',
            target: 'work_notes',
          },
        ],
      });
    });

    it('should not patch a configuration connector when it is in a different space', async () => {
      const connector = await createConnector({
        supertest,
        req: {
          ...getServiceNowConnector(),
          config: { apiUrl: serviceNowSimulatorURL },
        },
        auth: authSpace1,
      });

      actionsRemover.add(space, connector.id, 'action', 'actions');

      // Configuration is created with no connector so the mappings are empty
      const configuration = await createConfiguration(
        supertest,
        getConfigurationRequest(),
        200,
        authSpace1
      );

      // the update request doesn't accept the owner field
      const { owner, ...reqWithoutOwner } = getConfigurationRequest({
        id: connector.id,
        name: connector.name,
        type: connector.connector_type_id as ConnectorTypes,
        fields: null,
      });

      await updateConfiguration(
        supertest,
        configuration.id,
        {
          ...reqWithoutOwner,
          version: configuration.version,
        },
        404,
        getAuthWithSuperUser('space2')
      );
    });
  });
};
