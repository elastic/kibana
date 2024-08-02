/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';

import { FtrProviderContext } from '../../../ftr_provider_context';
import { USER } from '../../../../functional/services/ml/security_common';
import { getCommonRequestHeader } from '../../../../functional/services/ml/common_api';

export default ({ getService }: FtrProviderContext) => {
  const supertest = getService('supertestWithoutAuth');
  const ml = getService('ml');

  const expectedDefaults = {
    anomaly_detectors: {
      model_memory_limit: '1gb',
      categorization_examples_limit: 4,
      model_snapshot_retention_days: 10,
      daily_model_snapshot_retention_after_days: 1,
      categorization_analyzer: {
        char_filter: ['first_line_with_letters'],
        tokenizer: 'ml_standard',
        filter: [
          {
            type: 'stop',
            stopwords: [
              'Monday',
              'Tuesday',
              'Wednesday',
              'Thursday',
              'Friday',
              'Saturday',
              'Sunday',
              'Mon',
              'Tue',
              'Wed',
              'Thu',
              'Fri',
              'Sat',
              'Sun',
              'January',
              'February',
              'March',
              'April',
              'May',
              'June',
              'July',
              'August',
              'September',
              'October',
              'November',
              'December',
              'Jan',
              'Feb',
              'Mar',
              'Apr',
              'May',
              'Jun',
              'Jul',
              'Aug',
              'Sep',
              'Oct',
              'Nov',
              'Dec',
              'GMT',
              'UTC',
            ],
          },
          {
            type: 'limit',
            max_token_count: '100',
          },
        ],
      },
    },
    datafeeds: {
      scroll_size: 1000,
    },
  };

  async function runRequest(user: USER) {
    const { body, status } = await supertest
      .get(`/internal/ml/info`)
      .auth(user, ml.securityCommon.getPasswordForUser(user))
      .set(getCommonRequestHeader('1'));
    ml.api.assertResponseStatusCode(200, status, body);

    return body;
  }

  describe('GET ml/info', function () {
    it('should match expected values', async () => {
      const resp = await runRequest(USER.ML_POWERUSER);

      expect(resp.upgrade_mode).to.eql(false, 'upgrade_mode should be false');

      // defaults should always be the same
      expect(resp.defaults).to.eql(expectedDefaults, 'defaults should match expected values');

      // native code should always be present but values depend on the build
      expect(resp.native_code).to.not.eql(undefined, 'native_code should be present');
      expect(resp.native_code.version).to.not.eql(
        undefined,
        'native_code.version should be present'
      );
      expect(resp.native_code.build_hash).to.not.eql(
        undefined,
        'native_code.build_hash should be present'
      );

      // limits should always be present but values depend on hardware
      expect(resp.limits).to.not.eql(undefined, 'limits should be present');
      expect(resp.limits.total_ml_memory).to.not.eql(
        undefined,
        'total_ml_memory should be present'
      );
      expect(resp.limits.total_ml_processors).to.not.eql(
        undefined,
        'total_ml_processors should be present'
      );
      expect(resp.limits.effective_max_model_memory_limit).to.not.eql(
        undefined,
        'effective_max_model_memory_limit should be present'
      );
      expect(resp.limits.max_single_ml_node_processors).to.not.eql(
        undefined,
        'max_single_ml_node_processors should be present'
      );
    });
  });
};
