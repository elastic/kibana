/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import { FtrProviderContext } from '../../../../../common/ftr_provider_context';

import { ObjectRemover as ActionsRemover } from '../../../../../alerting_api_integration/common/lib';
import {
  ExternalServiceSimulator,
  getExternalServiceSimulatorPath,
} from '../../../../../alerting_api_integration/common/fixtures/plugins/actions_simulators/server/plugin';
import { ConnectorTypes } from '../../../../../../plugins/cases/common/api';
import {
  removeServerGeneratedPropertiesFromSavedObject,
  getConfigurationOutput,
  deleteConfiguration,
  getConfiguration,
  createConfiguration,
  getConfigurationRequest,
  createConnector,
  getServiceNowConnector,
} from '../../../../common/lib/utils';

// eslint-disable-next-line import/no-default-export
export default ({ getService }: FtrProviderContext): void => {
  const supertest = getService('supertest');
  const es = getService('es');
  const kibanaServer = getService('kibanaServer');

  describe('get_configure', () => {
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

    it('should return an empty find body correctly if no configuration is loaded', async () => {
      const configuration = await getConfiguration(supertest);
      expect(configuration).to.eql({});
    });

    it('should return a configuration', async () => {
      await createConfiguration(supertest);
      const configuration = await getConfiguration(supertest);

      const data = removeServerGeneratedPropertiesFromSavedObject(configuration);
      expect(data).to.eql(getConfigurationOutput());
    });

    it('should return a configuration with mapping', async () => {
      const connector = await createConnector(supertest, {
        ...getServiceNowConnector(),
        config: { apiUrl: servicenowSimulatorURL },
      });

      actionsRemover.add('default', connector.id, 'action', 'actions');

      await createConfiguration(
        supertest,
        getConfigurationRequest({
          id: connector.id,
          name: connector.name,
          type: connector.connector_type_id as ConnectorTypes,
        })
      );

      const configuration = await getConfiguration(supertest);
      const data = removeServerGeneratedPropertiesFromSavedObject(configuration);
      expect(data).to.eql(
        getConfigurationOutput(false, {
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
          connector: {
            id: connector.id,
            name: connector.name,
            type: connector.connector_type_id,
            fields: null,
          },
        })
      );
    });
  });
};
