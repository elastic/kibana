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

  describe('get_configure', () => {
    afterEach(async () => {
      await deleteConfiguration(es);
    });

    it('should return an empty find body correctly if no configuration is loaded', async () => {
      const { body } = await supertest
        .get(CASE_CONFIGURE_URL)
        .set('kbn-xsrf', 'true')
        .send()
        .expect(200);

      expect(body).to.eql({});
    });

    it('should return a configuration', async () => {
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
