/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import expect from '@kbn/expect';

import type { PostTransformsPreviewRequestSchema } from '../../../../plugins/transform/common/api_schemas/transforms';

import { FtrProviderContext } from '../../ftr_provider_context';
import { COMMON_REQUEST_HEADERS } from '../../../functional/services/ml/common_api';
import { USER } from '../../../functional/services/transform/security_common';

import { generateTransformConfig } from './common';

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
    // passing in an empty string for transform id since we will not use
    // it as part of the config request schema. Destructuring will
    // remove the `dest` part of the config.
    const { dest, ...config } = generateTransformConfig('');
    return config as PostTransformsPreviewRequestSchema;
  }

  describe('/api/transform/transforms/_preview', function () {
    before(async () => {
      await esArchiver.loadIfNeeded('ml/farequote');
      await transform.testResources.setKibanaTimeZoneToUTC();
      await transform.api.waitForIndicesToExist('ft_farequote');
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

    it('should return a correct error for transform preview', async () => {
      const { body } = await supertest
        .post(`/api/transform/transforms/_preview`)
        .auth(
          USER.TRANSFORM_POWERUSER,
          transform.securityCommon.getPasswordForUser(USER.TRANSFORM_POWERUSER)
        )
        .set(COMMON_REQUEST_HEADERS)
        .send({
          ...getTransformPreviewConfig(),
          pivot: {
            group_by: { airline: { terms: { field: 'airline' } } },
            aggregations: {
              '@timestamp.value_count': { value_countt: { field: '@timestamp' } },
            },
          },
        })
        .expect(400);

      expect(body.message).to.eql(
        '[parsing_exception] Unknown aggregation type [value_countt] did you mean [value_count]?, with line=1 & col=43'
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
