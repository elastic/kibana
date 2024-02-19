/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import http from 'http';
import expect from '@kbn/expect';
import { ConnectorTypes } from '@kbn/cases-plugin/common/types/domain';
import { FtrProviderContext } from '../../../../common/ftr_provider_context';
import { createConnector, deleteAllConnectors } from '../../../../../common/utils/connectors';

import {
  getConfigurationRequest,
  removeServerGeneratedPropertiesFromSavedObject,
  getConfigurationOutput,
  deleteConfiguration,
  createConfiguration,
  updateConfiguration,
  getServiceNowConnector,
  getServiceNowSimulationServer,
} from '../../../../common/lib/api';

// eslint-disable-next-line import/no-default-export
export default ({ getService }: FtrProviderContext): void => {
  const supertest = getService('supertest');
  const es = getService('es');

  describe('patch_configure', () => {
    let serviceNowSimulatorURL: string = '';
    let serviceNowServer: http.Server;

    before(async () => {
      const { server, url } = await getServiceNowSimulationServer();
      serviceNowServer = server;
      serviceNowSimulatorURL = url;
    });

    afterEach(async () => {
      await deleteConfiguration(es);
      await deleteAllConnectors(supertest);
    });

    after(async () => {
      serviceNowServer.close();
    });

    it('should patch a configuration connector and create mappings', async () => {
      const connectorParams = {
        ...getServiceNowConnector(),
        config: { apiUrl: serviceNowSimulatorURL },
      };
      const connectorId = await createConnector(supertest, connectorParams);

      // Configuration is created with no connector so the mappings are empty
      const configuration = await createConfiguration(supertest);

      // the update request doesn't accept the owner field
      const { owner, ...reqWithoutOwner } = getConfigurationRequest({
        id: connectorId,
        name: connectorParams.name,
        type: connectorParams.connector_type_id as ConnectorTypes,
        fields: null,
      });

      const newConfiguration = await updateConfiguration(supertest, configuration.id, {
        ...reqWithoutOwner,
        version: configuration.version,
      });

      const data = removeServerGeneratedPropertiesFromSavedObject(newConfiguration);
      expect(data).to.eql({
        ...getConfigurationOutput(true),
        connector: {
          id: connectorId,
          name: connectorParams.name,
          type: connectorParams.connector_type_id as ConnectorTypes,
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

    it('should mappings when updating the connector', async () => {
      const connectorParams = {
        ...getServiceNowConnector(),
        config: { apiUrl: serviceNowSimulatorURL },
      };
      const connectorId = await createConnector(supertest, connectorParams);

      // Configuration is created with connector so the mappings are created
      const configuration = await createConfiguration(
        supertest,
        getConfigurationRequest({
          id: connectorId,
          name: connectorParams.name,
          type: connectorParams.connector_type_id as ConnectorTypes,
        })
      );

      // the update request doesn't accept the owner field
      const { owner, ...rest } = getConfigurationRequest({
        id: connectorId,
        name: 'New name',
        type: connectorParams.connector_type_id as ConnectorTypes,
        fields: null,
      });

      const newConfiguration = await updateConfiguration(supertest, configuration.id, {
        ...rest,
        version: configuration.version,
      });

      const data = removeServerGeneratedPropertiesFromSavedObject(newConfiguration);
      expect(data).to.eql({
        ...getConfigurationOutput(true),
        connector: {
          id: connectorId,
          name: 'New name',
          type: connectorParams.connector_type_id as ConnectorTypes,
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
  });
};
