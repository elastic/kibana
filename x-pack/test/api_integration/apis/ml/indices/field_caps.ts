/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';

import { FtrProviderContext } from '../../../ftr_provider_context';
import { COMMON_REQUEST_HEADERS } from '../../../../functional/services/ml/common_api';
import { USER } from '../../../../functional/services/ml/security_common';

export default ({ getService }: FtrProviderContext) => {
  const supertest = getService('supertestWithoutAuth');
  const esArchiver = getService('esArchiver');
  const ml = getService('ml');

  async function runRequest(
    index: string,
    fields?: string[]
  ): Promise<{ indices: string[]; fields: any }> {
    const { body, status } = await supertest
      .post(`/api/ml/indices/field_caps`)
      .auth(USER.ML_POWERUSER, ml.securityCommon.getPasswordForUser(USER.ML_POWERUSER))
      .set(COMMON_REQUEST_HEADERS)
      .send({ index, fields });
    ml.api.assertResponseStatusCode(200, status, body);

    return body;
  }

  describe('field_caps', function () {
    before(async () => {
      await esArchiver.loadIfNeeded('x-pack/test/functional/es_archives/ml/farequote');
    });

    after(async () => {
      await ml.api.cleanMlIndices();
    });

    it('selected fields in index', async () => {
      const { indices, fields } = await runRequest('ft_farequote', ['airline', 'responsetime']);
      expect(indices.length).to.eql(
        1,
        `Expected number of indices to be 1, but got ${indices.length}`
      );
      const fieldsLength = Object.keys(fields).length;
      expect(fieldsLength).to.eql(2, `Expected number of fields to be 2, but got ${fieldsLength}`);
      expect(fields.airline.keyword.type).to.eql('keyword', 'Expected airline type to be keyword');
      expect(fields.responsetime.float.type).to.eql(
        'float',
        'Expected responsetime type to be float'
      );
    });

    it('all fields in index', async () => {
      const { indices, fields } = await runRequest('ft_farequote');
      expect(indices.length).to.eql(
        1,
        `Expected number of indices to be 1, but got ${indices.length}`
      );
      const fieldsArr = Object.keys(fields);

      // The fields we expect at least to be present. We don't check for all fields in the test here
      // because the number of fields can vary depending on the ES version.
      const expectedFieldsArr = ['@timestamp', 'airline', 'responsetime'];
      const allExpectedFieldsPresent = expectedFieldsArr.every((f) => fieldsArr.includes(f));
      expect(allExpectedFieldsPresent).to.eql(true, 'Not all expected fields are present.');

      // Across ES versions the number of returned meta fields can vary, but there should be at least 20.
      expect(fieldsArr.length).to.greaterThan(20, 'Expected at least 20 fields to be returned.');
    });
  });
};
