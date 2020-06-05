/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import expect from '@kbn/expect';
import { FtrProviderContext } from '../../../common/ftr_provider_context';

import { CASE_CONFIGURE_URL } from '../../../../../plugins/case/common/constants';
import {
  getConfiguration,
  removeServerGeneratedPropertiesFromConfigure,
  getConfigurationOutput,
  deleteConfiguration,
} from '../../../common/lib/utils';

// eslint-disable-next-line import/no-default-export
export default ({ getService }: FtrProviderContext): void => {
  const supertest = getService('supertest');
  const es = getService('es');

  describe('post_configure', () => {
    afterEach(async () => {
      await deleteConfiguration(es);
    });

    it('should create a configuration', async () => {
      const { body } = await supertest
        .post(CASE_CONFIGURE_URL)
        .set('kbn-xsrf', 'true')
        .send(getConfiguration())
        .expect(200);

      const data = removeServerGeneratedPropertiesFromConfigure(body);
      expect(data).to.eql(getConfigurationOutput());
    });

    it('should keep only the latest configuration', async () => {
      await supertest
        .post(CASE_CONFIGURE_URL)
        .set('kbn-xsrf', 'true')
        .send(getConfiguration('connector-2'))
        .expect(200);

      await supertest
        .post(CASE_CONFIGURE_URL)
        .set('kbn-xsrf', 'true')
        .send(getConfiguration())
        .expect(200);

      const { body } = await supertest
        .get(CASE_CONFIGURE_URL)
        .set('kbn-xsrf', 'true')
        .send()
        .expect(200);

      const data = removeServerGeneratedPropertiesFromConfigure(body);
      expect(data).to.eql(getConfigurationOutput());
    });
  });
};
