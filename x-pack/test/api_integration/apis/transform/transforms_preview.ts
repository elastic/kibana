/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import expect from '@kbn/expect';
import { FtrProviderContext } from '../../ftr_provider_context';
import { COMMON_REQUEST_HEADERS } from '../../../functional/services/ml/common';
import { USER } from '../../../functional/services/transform/security_common';

export default ({ getService }: FtrProviderContext) => {
  const esArchiver = getService('esArchiver');
  const supertest = getService('supertestWithoutAuth');
  const transform = getService('transform');

  const expected = {
    apiTransformTransformsPreview: {
      previewItemCount: 19,
      typeOfGeneratedDestIndex: 'object',
    },
  };

  function getTransformPreviewConfig() {
    return {
      source: { index: ['farequote-*'] },
      pivot: {
        group_by: { airline: { terms: { field: 'airline' } } },
        aggregations: { '@timestamp.value_count': { value_count: { field: '@timestamp' } } },
      },
    };
  }

  describe('/api/transform/transforms/_preview', function () {
    before(async () => {
      await esArchiver.loadIfNeeded('ml/farequote');
      await transform.testResources.setKibanaTimeZoneToUTC();
    });

    it('should return a transform preview', async () => {
      const { body } = await supertest
        .post('/api/transform/transforms/_preview')
        .auth(
          USER.TRANSFORM_POWERUSER,
          transform.securityCommon.getPasswordForUser(USER.TRANSFORM_POWERUSER)
        )
        .set(COMMON_REQUEST_HEADERS)
        .send(getTransformPreviewConfig())
        .expect(200);

      expect(body.preview).to.have.length(expected.apiTransformTransformsPreview.previewItemCount);
      expect(typeof body.generated_dest_index).to.eql(
        expected.apiTransformTransformsPreview.typeOfGeneratedDestIndex
      );
    });

    it('should return 403 for transform view-only user', async () => {
      await supertest
        .post(`/api/transform/transforms/_preview`)
        .auth(
          USER.TRANSFORM_VIEWER,
          transform.securityCommon.getPasswordForUser(USER.TRANSFORM_VIEWER)
        )
        .set(COMMON_REQUEST_HEADERS)
        .send(getTransformPreviewConfig())
        .expect(403);
    });
  });
};
