/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import { ConnectorTypes } from '../../../../../../plugins/cases/common/api';
import { FtrProviderContext } from '../../../../../common/ftr_provider_context';

import {
  getConfigurationRequest,
  removeServerGeneratedPropertiesFromSavedObject,
  getConfigurationOutput,
  deleteConfiguration,
  createConfiguration,
  getConfiguration,
} from '../../../../common/lib/utils';

// eslint-disable-next-line import/no-default-export
export default ({ getService }: FtrProviderContext): void => {
  const supertest = getService('supertest');
  const es = getService('es');

  describe('post_configure', () => {
    afterEach(async () => {
      await deleteConfiguration(es);
    });

    it('should create a configuration', async () => {
      const configuration = await createConfiguration(supertest);

      const data = removeServerGeneratedPropertiesFromSavedObject(configuration);
      expect(data).to.eql(getConfigurationOutput());
    });

    it('should keep only the latest configuration', async () => {
      await createConfiguration(supertest, getConfigurationRequest({ id: 'connector-2' }));
      await createConfiguration(supertest);
      const configuration = await getConfiguration(supertest);

      const data = removeServerGeneratedPropertiesFromSavedObject(configuration);
      expect(data).to.eql(getConfigurationOutput());
    });

    it('should not create a configuration when missing connector.id', async () => {
      await createConfiguration(
        supertest,
        {
          // @ts-expect-error
          connector: {
            name: 'Connector',
            type: ConnectorTypes.none,
            fields: null,
          },
          closure_type: 'close-by-user',
        },
        400
      );
    });

    it('should not create a configuration when missing connector.name', async () => {
      await createConfiguration(
        supertest,
        {
          // @ts-expect-error
          connector: {
            id: 'test-id',
            type: ConnectorTypes.none,
            fields: null,
          },
          closure_type: 'close-by-user',
        },
        400
      );
    });

    it('should not create a configuration when missing connector.type', async () => {
      await createConfiguration(
        supertest,
        {
          // @ts-expect-error
          connector: {
            id: 'test-id',
            name: 'Connector',
            fields: null,
          },
          closure_type: 'close-by-user',
        },
        400
      );
    });

    it('should not create a configuration when missing connector.fields', async () => {
      await createConfiguration(
        supertest,
        {
          // @ts-expect-error
          connector: {
            id: 'test-id',
            type: ConnectorTypes.none,
            name: 'Connector',
          },
          closure_type: 'close-by-user',
        },
        400
      );
    });

    it('should not create a configuration when when missing closure_type', async () => {
      await createConfiguration(
        supertest,
        // @ts-expect-error
        {
          connector: {
            id: 'test-id',
            type: ConnectorTypes.none,
            name: 'Connector',
            fields: null,
          },
        },
        400
      );
    });

    it('should not create a configuration when when fields are not null', async () => {
      await createConfiguration(
        supertest,
        {
          connector: {
            id: 'test-id',
            type: ConnectorTypes.none,
            name: 'Connector',
            // @ts-expect-error
            fields: {},
          },
          closure_type: 'close-by-user',
        },
        400
      );
    });

    it('should not create a configuration with unsupported connector type', async () => {
      // @ts-expect-error
      await createConfiguration(supertest, getConfigurationRequest({ type: '.unsupported' }), 400);
    });

    it('should not create a configuration with unsupported connector fields', async () => {
      await createConfiguration(
        supertest,
        // @ts-expect-error
        getConfigurationRequest({ type: '.jira', fields: { unsupported: 'value' } }),
        400
      );
    });
  });
};
