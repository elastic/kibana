/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import { FtrProviderContext } from '../../../../common/ftr_provider_context';
import { ObjectRemover as ActionsRemover } from '../../../../../alerting_api_integration/common/lib';
import {
  ExternalServiceSimulator,
  getExternalServiceSimulatorPath,
} from '../../../../../alerting_api_integration/common/fixtures/plugins/actions_simulators/server/plugin';

import {
  getConfigurationRequest,
  removeServerGeneratedPropertiesFromSavedObject,
  getConfigurationOutput,
  deleteConfiguration,
  createConfiguration,
  updateConfiguration,
  getServiceNowConnector,
  createConnector,
} from '../../../../common/lib/utils';
import { ConnectorTypes } from '../../../../../../plugins/cases/common/api';

// eslint-disable-next-line import/no-default-export
export default ({ getService }: FtrProviderContext): void => {
  const supertest = getService('supertest');
  const es = getService('es');
  const kibanaServer = getService('kibanaServer');

  describe('patch_configure', () => {
    const actionsRemover = new ActionsRemover(supertest);
    let servicenowSimulatorURL: string = '<could not determine kibana url>';

    before(() => {
      servicenowSimulatorURL = kibanaServer.resolveUrl(
        getExternalServiceSimulatorPath(ExternalServiceSimulator.SERVICENOW)
      );
    });

    afterEach(async () => {
      await deleteConfiguration(es);
      await actionsRemover.removeAll();
    });

    it('should patch a configuration connector and create mappings', async () => {
      const connector = await createConnector({
        supertest,
        req: {
          ...getServiceNowConnector(),
          config: { apiUrl: servicenowSimulatorURL },
        },
      });

      actionsRemover.add('default', connector.id, 'action', 'actions');

      // Configuration is created with no connector so the mappings are empty
      const configuration = await createConfiguration(supertest);

      // the update request doesn't accept the owner field
      const { owner, ...reqWithoutOwner } = getConfigurationRequest({
        id: connector.id,
        name: connector.name,
        type: connector.connector_type_id as ConnectorTypes,
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

    it('should mappings when updating the connector', async () => {
      const connector = await createConnector({
        supertest,
        req: {
          ...getServiceNowConnector(),
          config: { apiUrl: servicenowSimulatorURL },
        },
      });

      actionsRemover.add('default', connector.id, 'action', 'actions');

      // Configuration is created with connector so the mappings are created
      const configuration = await createConfiguration(
        supertest,
        getConfigurationRequest({
          id: connector.id,
          name: connector.name,
          type: connector.connector_type_id as ConnectorTypes,
        })
      );

      // the update request doesn't accept the owner field
      const { owner, ...rest } = getConfigurationRequest({
        id: connector.id,
        name: 'New name',
        type: connector.connector_type_id as ConnectorTypes,
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
          id: connector.id,
          name: 'New name',
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
  });
};
