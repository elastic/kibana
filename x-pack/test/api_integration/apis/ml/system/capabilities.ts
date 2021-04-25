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
import { MlCapabilitiesResponse } from '../../../../../plugins/ml/common/types/capabilities';

export default ({ getService }: FtrProviderContext) => {
  const supertest = getService('supertestWithoutAuth');
  const ml = getService('ml');

  async function runRequest(user: USER): Promise<MlCapabilitiesResponse> {
    const { body } = await supertest
      .get(`/api/ml/ml_capabilities`)
      .auth(user, ml.securityCommon.getPasswordForUser(user))
      .set(COMMON_REQUEST_HEADERS)
      .expect(200);

    return body;
  }

  describe('ml_capabilities', () => {
    describe('get capabilities', function () {
      it('should be enabled in space', async () => {
        const { mlFeatureEnabledInSpace } = await runRequest(USER.ML_POWERUSER);
        expect(mlFeatureEnabledInSpace).to.eql(true);
      });

      it('should have upgradeInProgress false', async () => {
        const { upgradeInProgress } = await runRequest(USER.ML_POWERUSER);
        expect(upgradeInProgress).to.eql(false);
      });

      it('should have full license', async () => {
        const { isPlatinumOrTrialLicense } = await runRequest(USER.ML_POWERUSER);
        expect(isPlatinumOrTrialLicense).to.eql(true);
      });

      it('should have the right number of capabilities', async () => {
        const { capabilities } = await runRequest(USER.ML_POWERUSER);
        expect(Object.keys(capabilities).length).to.eql(30);
      });

      it('should get viewer capabilities', async () => {
        const { capabilities } = await runRequest(USER.ML_VIEWER);

        expect(capabilities).to.eql({
          canCreateJob: false,
          canDeleteJob: false,
          canOpenJob: false,
          canCloseJob: false,
          canUpdateJob: false,
          canForecastJob: false,
          canCreateDatafeed: false,
          canDeleteDatafeed: false,
          canStartStopDatafeed: false,
          canUpdateDatafeed: false,
          canPreviewDatafeed: false,
          canGetFilters: false,
          canCreateCalendar: false,
          canDeleteCalendar: false,
          canCreateFilter: false,
          canDeleteFilter: false,
          canCreateDataFrameAnalytics: false,
          canDeleteDataFrameAnalytics: false,
          canStartStopDataFrameAnalytics: false,
          canCreateMlAlerts: false,
          canUseMlAlerts: true,
          canAccessML: true,
          canGetJobs: true,
          canGetDatafeeds: true,
          canGetCalendars: true,
          canFindFileStructure: true,
          canGetDataFrameAnalytics: true,
          canGetAnnotations: true,
          canCreateAnnotation: true,
          canDeleteAnnotation: true,
        });
      });

      it('should get power user capabilities', async () => {
        const { capabilities } = await runRequest(USER.ML_POWERUSER);

        expect(capabilities).to.eql({
          canCreateJob: true,
          canDeleteJob: true,
          canOpenJob: true,
          canCloseJob: true,
          canUpdateJob: true,
          canForecastJob: true,
          canCreateDatafeed: true,
          canDeleteDatafeed: true,
          canStartStopDatafeed: true,
          canUpdateDatafeed: true,
          canPreviewDatafeed: true,
          canGetFilters: true,
          canCreateCalendar: true,
          canDeleteCalendar: true,
          canCreateFilter: true,
          canDeleteFilter: true,
          canCreateDataFrameAnalytics: true,
          canDeleteDataFrameAnalytics: true,
          canStartStopDataFrameAnalytics: true,
          canCreateMlAlerts: true,
          canUseMlAlerts: true,
          canAccessML: true,
          canGetJobs: true,
          canGetDatafeeds: true,
          canGetCalendars: true,
          canFindFileStructure: true,
          canGetDataFrameAnalytics: true,
          canGetAnnotations: true,
          canCreateAnnotation: true,
          canDeleteAnnotation: true,
        });
      });
    });
  });
};
