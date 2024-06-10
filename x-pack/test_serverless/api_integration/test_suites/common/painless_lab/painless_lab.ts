/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import { FtrProviderContext } from '../../../ftr_provider_context';
import { RoleCredentials } from '../../../../shared/services';

const API_BASE_PATH = '/api/painless_lab';

export default function ({ getService }: FtrProviderContext) {
  const svlCommonApi = getService('svlCommonApi');
  const svlUserManager = getService('svlUserManager');
  const supertestWithoutAuth = getService('supertestWithoutAuth');
  let roleAuthc: RoleCredentials;

  describe('Painless Lab Routes', function () {
    before(async () => {
      roleAuthc = await svlUserManager.createApiKeyForRole('admin');
    });
    after(async () => {
      await svlUserManager.invalidateApiKeyForRole(roleAuthc);
    });
    describe('Execute', () => {
      it('should execute a valid painless script', async () => {
        const script =
          '"{\\n  \\"script\\": {\\n    \\"source\\": \\"return true;\\",\\n    \\"params\\": {\\n  \\"string_parameter\\": \\"string value\\",\\n  \\"number_parameter\\": 1.5,\\n  \\"boolean_parameter\\": true\\n}\\n  }\\n}"';

        const { body } = await supertestWithoutAuth
          .post(`${API_BASE_PATH}/execute`)
          .set(svlCommonApi.getInternalRequestHeader())
          .set(roleAuthc.apiKeyHeader)
          .set('Content-Type', 'application/json;charset=UTF-8')
          .send(script)
          .expect(200);

        expect(body).to.eql({
          result: 'true',
        });
      });

      it('should return error response for invalid painless script', async () => {
        const invalidScript =
          '"{\\n  \\"script\\": {\\n    \\"source\\": \\"foobar\\",\\n    \\"params\\": {\\n  \\"string_parameter\\": \\"string value\\",\\n  \\"number_parameter\\": 1.5,\\n  \\"boolean_parameter\\": true\\n}\\n  }\\n}"';

        const { body } = await supertestWithoutAuth
          .post(`${API_BASE_PATH}/execute`)
          .set(svlCommonApi.getInternalRequestHeader())
          .set('Content-Type', 'application/json;charset=UTF-8')
          .set(roleAuthc.apiKeyHeader)
          .send(invalidScript)
          .expect(200);

        expect(body.error).to.not.be(undefined);
        expect(body.error.reason).to.eql('compile error');
      });
    });
  });
}
