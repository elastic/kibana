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

    it('should patch a configuration', async () => {
      const res = await supertest
        .post(CASE_CONFIGURE_URL)
        .set('kbn-xsrf', 'true')
        .send(getConfiguration())
        .expect(200);

      const { body } = await supertest
        .patch(CASE_CONFIGURE_URL)
        .set('kbn-xsrf', 'true')
        .send({ closure_type: 'close-by-pushing', version: res.body.version })
        .expect(200);

      const data = removeServerGeneratedPropertiesFromConfigure(body);
      expect(data).to.eql({ ...getConfigurationOutput(true), closure_type: 'close-by-pushing' });
    });

    it('should handle patch request when there is no configuration', async () => {
      const { body } = await supertest
        .patch(CASE_CONFIGURE_URL)
        .set('kbn-xsrf', 'true')
        .send({ closure_type: 'close-by-pushing', version: 'no-version' })
        .expect(409);

      expect(body).to.eql({
        error: 'Conflict',
        message:
          'You can not patch this configuration since you did not created first with a post.',
        statusCode: 409,
      });
    });

    it('should handle patch request when versions are different', async () => {
      await supertest
        .post(CASE_CONFIGURE_URL)
        .set('kbn-xsrf', 'true')
        .send(getConfiguration())
        .expect(200);

      const { body } = await supertest
        .patch(CASE_CONFIGURE_URL)
        .set('kbn-xsrf', 'true')
        .send({ closure_type: 'close-by-pushing', version: 'no-version' })
        .expect(409);

      expect(body).to.eql({
        error: 'Conflict',
        message:
          'This configuration has been updated. Please refresh before saving additional updates.',
        statusCode: 409,
      });
    });
  });
};
