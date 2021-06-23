/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import { nullUser } from '../../../../common/lib/mock';
import { FtrProviderContext } from '../../../../common/ftr_provider_context';

import {
  removeServerGeneratedPropertiesFromSavedObject,
  getConfigurationOutput,
  deleteConfiguration,
  getConfiguration,
  createConfiguration,
  getConfigurationRequest,
  getAuthWithSuperUser,
} from '../../../../common/lib/utils';

// eslint-disable-next-line import/no-default-export
export default ({ getService }: FtrProviderContext): void => {
  const supertest = getService('supertest');
  const es = getService('es');
  const authSpace1 = getAuthWithSuperUser();

  describe('get_configure', () => {
    afterEach(async () => {
      await deleteConfiguration(es);
    });

    it('should return a configuration in space1', async () => {
      await createConfiguration(supertest, getConfigurationRequest(), 200, authSpace1);
      const configuration = await getConfiguration({ supertest, auth: authSpace1 });

      const data = removeServerGeneratedPropertiesFromSavedObject(configuration[0]);
      expect(data).to.eql(getConfigurationOutput(false, { created_by: nullUser }));
    });

    it('should not find a configuration when looking in a different space', async () => {
      await createConfiguration(supertest, getConfigurationRequest(), 200, authSpace1);
      const configuration = await getConfiguration({
        supertest,
        auth: getAuthWithSuperUser('space2'),
      });

      expect(configuration).to.eql([]);
    });
  });
};
