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

    it('should patch a configuration', async () => {
      const configuration = await createConfiguration(supertest);
      const newConfiguration = await updateConfiguration(supertest, {
        closure_type: 'close-by-pushing',
        version: configuration.version,
      });

      const data = removeServerGeneratedPropertiesFromSavedObject(newConfiguration);
      expect(data).to.eql({ ...getConfigurationOutput(true), closure_type: 'close-by-pushing' });
    });

    it('should patch a configuration: connector', async () => {
      const connector = await createConnector(supertest, {
        ...getServiceNowConnector(),
        config: { apiUrl: servicenowSimulatorURL },
      });

      actionsRemover.add('default', connector.id, 'action', 'actions');

      const configuration = await createConfiguration(supertest);
      const newConfiguration = await updateConfiguration(supertest, {
        ...getConfigurationRequest({
          id: connector.id,
          name: connector.name,
          type: connector.connector_type_id as ConnectorTypes,
          fields: null,
        }),
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

    it('should not patch a configuration with unsupported connector type', async () => {
      await createConfiguration(supertest);
      await updateConfiguration(
        supertest,
        // @ts-expect-error
        getConfigurationRequest({ type: '.unsupported' }),
        400
      );
    });

    it('should not patch a configuration with unsupported connector fields', async () => {
      await createConfiguration(supertest);
      await updateConfiguration(
        supertest,
        // @ts-expect-error
        getConfigurationRequest({ type: '.jira', fields: { unsupported: 'value' } }),
        400
      );
    });

    it('should handle patch request when there is no configuration', async () => {
      const error = await updateConfiguration(
        supertest,
        { closure_type: 'close-by-pushing', version: 'no-version' },
        409
      );

      expect(error).to.eql({
        error: 'Conflict',
        message:
          'You can not patch this configuration since you did not created first with a post.',
        statusCode: 409,
      });
    });

    it('should handle patch request when versions are different', async () => {
      await createConfiguration(supertest);
      const error = await updateConfiguration(
        supertest,
        { closure_type: 'close-by-pushing', version: 'no-version' },
        409
      );

      expect(error).to.eql({
        error: 'Conflict',
        message:
          'This configuration has been updated. Please refresh before saving additional updates.',
        statusCode: 409,
      });
    });
  });
};
