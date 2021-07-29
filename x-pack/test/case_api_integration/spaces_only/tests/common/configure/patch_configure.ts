/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import { FtrProviderContext } from '../../../../common/ftr_provider_context';

import {
  getConfigurationRequest,
  removeServerGeneratedPropertiesFromSavedObject,
  getConfigurationOutput,
  deleteConfiguration,
  createConfiguration,
  updateConfiguration,
  getAuthWithSuperUser,
} from '../../../../common/lib/utils';
import { nullUser } from '../../../../common/lib/mock';

// eslint-disable-next-line import/no-default-export
export default ({ getService }: FtrProviderContext): void => {
  const supertest = getService('supertest');
  const es = getService('es');
  const authSpace1 = getAuthWithSuperUser();

  describe('patch_configure', () => {
    afterEach(async () => {
      await deleteConfiguration(es);
    });

    it('should patch a configuration in space1', async () => {
      const configuration = await createConfiguration(
        supertest,
        getConfigurationRequest(),
        200,
        authSpace1
      );
      const newConfiguration = await updateConfiguration(
        supertest,
        configuration.id,
        {
          closure_type: 'close-by-pushing',
          version: configuration.version,
        },
        200,
        authSpace1
      );

      const data = removeServerGeneratedPropertiesFromSavedObject(newConfiguration);
      expect(data).to.eql({
        ...getConfigurationOutput(false, { created_by: nullUser, updated_by: nullUser }),
        closure_type: 'close-by-pushing',
      });
    });

    it('should not patch a configuration in a different space', async () => {
      const configuration = await createConfiguration(
        supertest,
        getConfigurationRequest(),
        200,
        authSpace1
      );
      await updateConfiguration(
        supertest,
        configuration.id,
        {
          closure_type: 'close-by-pushing',
          version: configuration.version,
        },
        404,
        getAuthWithSuperUser('space2')
      );
    });
  });
};
