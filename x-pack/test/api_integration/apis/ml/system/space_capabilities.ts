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

const idSpaceWithMl = 'space_with_ml';
const idSpaceNoMl = 'space_no_ml';

export default ({ getService }: FtrProviderContext) => {
  const supertest = getService('supertestWithoutAuth');
  const spacesService = getService('spaces');
  const ml = getService('ml');

  async function runRequest(user: USER, space?: string): Promise<MlCapabilitiesResponse> {
    const { body, status } = await supertest
      .get(`${space ? `/s/${space}` : ''}/api/ml/ml_capabilities`)
      .auth(user, ml.securityCommon.getPasswordForUser(user))
      .set(COMMON_REQUEST_HEADERS);
    ml.api.assertResponseStatusCode(200, status, body);

    return body;
  }

  describe('ml_capabilities in spaces', () => {
    before(async () => {
      await spacesService.create({ id: idSpaceWithMl, name: 'space_one', disabledFeatures: [] });
      await spacesService.create({ id: idSpaceNoMl, name: 'space_two', disabledFeatures: ['ml'] });
    });

    after(async () => {
      await spacesService.delete(idSpaceWithMl);
      await spacesService.delete(idSpaceNoMl);
    });

    describe('get capabilities', function () {
      it('should be enabled in space - space with ML', async () => {
        const { mlFeatureEnabledInSpace } = await runRequest(USER.ML_POWERUSER, idSpaceWithMl);
        expect(mlFeatureEnabledInSpace).to.eql(true);
      });
      it('should not be enabled in space - space without ML', async () => {
        const { mlFeatureEnabledInSpace } = await runRequest(USER.ML_POWERUSER, idSpaceNoMl);
        expect(mlFeatureEnabledInSpace).to.eql(false);
      });

      it('should have upgradeInProgress false - space with ML', async () => {
        const { upgradeInProgress } = await runRequest(USER.ML_POWERUSER, idSpaceWithMl);
        expect(upgradeInProgress).to.eql(false);
      });
      it('should have upgradeInProgress false - space without ML', async () => {
        const { upgradeInProgress } = await runRequest(USER.ML_POWERUSER, idSpaceNoMl);
        expect(upgradeInProgress).to.eql(false);
      });

      it('should have full license - space with ML', async () => {
        const { isPlatinumOrTrialLicense } = await runRequest(USER.ML_POWERUSER, idSpaceWithMl);
        expect(isPlatinumOrTrialLicense).to.eql(true);
      });
      it('should have full license - space without ML', async () => {
        const { isPlatinumOrTrialLicense } = await runRequest(USER.ML_POWERUSER, idSpaceNoMl);
        expect(isPlatinumOrTrialLicense).to.eql(true);
      });

      it('should have the right number of capabilities - space with ML', async () => {
        const { capabilities } = await runRequest(USER.ML_POWERUSER, idSpaceWithMl);
        expect(Object.keys(capabilities).length).to.eql(32);
      });
      it('should have the right number of capabilities - space without ML', async () => {
        const { capabilities } = await runRequest(USER.ML_POWERUSER, idSpaceNoMl);
        expect(Object.keys(capabilities).length).to.eql(32);
      });

      it('should get viewer capabilities - space with ML', async () => {
        const { capabilities } = await runRequest(USER.ML_VIEWER, idSpaceWithMl);
        expect(capabilities).to.eql({
          canCreateJob: false,
          canDeleteJob: false,
          canOpenJob: false,
          canCloseJob: false,
          canResetJob: false,
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
          canViewMlNodes: false,
        });
      });

      it('should get viewer capabilities - space without ML', async () => {
        const { capabilities } = await runRequest(USER.ML_VIEWER, idSpaceNoMl);
        expect(capabilities).to.eql({
          canCreateJob: false,
          canDeleteJob: false,
          canOpenJob: false,
          canCloseJob: false,
          canResetJob: false,
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
          canUseMlAlerts: false,
          canAccessML: false,
          canGetJobs: false,
          canGetDatafeeds: false,
          canGetCalendars: false,
          canFindFileStructure: false,
          canGetDataFrameAnalytics: false,
          canGetAnnotations: false,
          canCreateAnnotation: false,
          canDeleteAnnotation: false,
          canViewMlNodes: false,
        });
      });

      it('should get power user capabilities - space with ML', async () => {
        const { capabilities } = await runRequest(USER.ML_POWERUSER, idSpaceWithMl);
        expect(capabilities).to.eql({
          canCreateJob: true,
          canDeleteJob: true,
          canOpenJob: true,
          canCloseJob: true,
          canResetJob: true,
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
          canViewMlNodes: true,
        });
      });

      it('should get power user capabilities - space without ML', async () => {
        const { capabilities } = await runRequest(USER.ML_POWERUSER, idSpaceNoMl);
        expect(capabilities).to.eql({
          canCreateJob: false,
          canDeleteJob: false,
          canOpenJob: false,
          canCloseJob: false,
          canResetJob: false,
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
          canUseMlAlerts: false,
          canAccessML: false,
          canGetJobs: false,
          canGetDatafeeds: false,
          canGetCalendars: false,
          canFindFileStructure: false,
          canGetDataFrameAnalytics: false,
          canGetAnnotations: false,
          canCreateAnnotation: false,
          canDeleteAnnotation: false,
          canViewMlNodes: false,
        });
      });
    });
  });
};
