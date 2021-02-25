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
    const { body } = await supertest
      .get(`${space ? `/s/${space}` : ''}/api/ml/ml_capabilities`)
      .auth(user, ml.securityCommon.getPasswordForUser(user))
      .set(COMMON_REQUEST_HEADERS)
      .expect(200);

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
      await ml.api.cleanMlIndices();
      await ml.testResources.cleanMLSavedObjects();
    });

    describe('get capabilities', function () {
      it('should have the right number of capabilities - space with ML - space with ML', async () => {
        const { mlFeatureEnabledInSpace } = await runRequest(USER.ML_POWERUSER, idSpaceWithMl);
        expect(mlFeatureEnabledInSpace).to.eql(true);
      });
      it('should have the right number of capabilities - space without ML', async () => {
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
        expect(Object.keys(capabilities).length).to.eql(29);
      });
      it('should have the right number of capabilities - space without ML', async () => {
        const { capabilities } = await runRequest(USER.ML_POWERUSER, idSpaceNoMl);
        expect(Object.keys(capabilities).length).to.eql(29);
      });

      it('should get viewer capabilities - space with ML', async () => {
        const { capabilities } = await runRequest(USER.ML_VIEWER, idSpaceWithMl);

        expect(capabilities.canCreateJob).to.eql(false);
        expect(capabilities.canDeleteJob).to.eql(false);
        expect(capabilities.canOpenJob).to.eql(false);
        expect(capabilities.canCloseJob).to.eql(false);
        expect(capabilities.canUpdateJob).to.eql(false);
        expect(capabilities.canForecastJob).to.eql(false);
        expect(capabilities.canCreateDatafeed).to.eql(false);
        expect(capabilities.canDeleteDatafeed).to.eql(false);
        expect(capabilities.canStartStopDatafeed).to.eql(false);
        expect(capabilities.canUpdateDatafeed).to.eql(false);
        expect(capabilities.canPreviewDatafeed).to.eql(false);
        expect(capabilities.canGetFilters).to.eql(false);
        expect(capabilities.canCreateCalendar).to.eql(false);
        expect(capabilities.canDeleteCalendar).to.eql(false);
        expect(capabilities.canCreateFilter).to.eql(false);
        expect(capabilities.canDeleteFilter).to.eql(false);
        expect(capabilities.canCreateDataFrameAnalytics).to.eql(false);
        expect(capabilities.canDeleteDataFrameAnalytics).to.eql(false);
        expect(capabilities.canStartStopDataFrameAnalytics).to.eql(false);
        expect(capabilities.canCreateMlAlerts).to.eql(false);
        expect(capabilities.canAccessML).to.eql(true);
        expect(capabilities.canGetJobs).to.eql(true);
        expect(capabilities.canGetDatafeeds).to.eql(true);
        expect(capabilities.canGetCalendars).to.eql(true);
        expect(capabilities.canFindFileStructure).to.eql(true);
        expect(capabilities.canGetDataFrameAnalytics).to.eql(true);
        expect(capabilities.canGetAnnotations).to.eql(true);
        expect(capabilities.canCreateAnnotation).to.eql(true);
        expect(capabilities.canDeleteAnnotation).to.eql(true);
      });

      it('should get viewer capabilities - space without ML', async () => {
        const { capabilities } = await runRequest(USER.ML_VIEWER, idSpaceNoMl);

        expect(capabilities.canCreateJob).to.eql(false);
        expect(capabilities.canDeleteJob).to.eql(false);
        expect(capabilities.canOpenJob).to.eql(false);
        expect(capabilities.canCloseJob).to.eql(false);
        expect(capabilities.canUpdateJob).to.eql(false);
        expect(capabilities.canForecastJob).to.eql(false);
        expect(capabilities.canCreateDatafeed).to.eql(false);
        expect(capabilities.canDeleteDatafeed).to.eql(false);
        expect(capabilities.canStartStopDatafeed).to.eql(false);
        expect(capabilities.canUpdateDatafeed).to.eql(false);
        expect(capabilities.canPreviewDatafeed).to.eql(false);
        expect(capabilities.canGetFilters).to.eql(false);
        expect(capabilities.canCreateCalendar).to.eql(false);
        expect(capabilities.canDeleteCalendar).to.eql(false);
        expect(capabilities.canCreateFilter).to.eql(false);
        expect(capabilities.canDeleteFilter).to.eql(false);
        expect(capabilities.canCreateDataFrameAnalytics).to.eql(false);
        expect(capabilities.canDeleteDataFrameAnalytics).to.eql(false);
        expect(capabilities.canStartStopDataFrameAnalytics).to.eql(false);
        expect(capabilities.canCreateMlAlerts).to.eql(false);
        expect(capabilities.canAccessML).to.eql(false);
        expect(capabilities.canGetJobs).to.eql(false);
        expect(capabilities.canGetDatafeeds).to.eql(false);
        expect(capabilities.canGetCalendars).to.eql(false);
        expect(capabilities.canFindFileStructure).to.eql(false);
        expect(capabilities.canGetDataFrameAnalytics).to.eql(false);
        expect(capabilities.canGetAnnotations).to.eql(false);
        expect(capabilities.canCreateAnnotation).to.eql(false);
        expect(capabilities.canDeleteAnnotation).to.eql(false);
      });

      it('should get power user capabilities - space with ML', async () => {
        const { capabilities } = await runRequest(USER.ML_POWERUSER, idSpaceWithMl);

        expect(capabilities.canCreateJob).to.eql(true);
        expect(capabilities.canDeleteJob).to.eql(true);
        expect(capabilities.canOpenJob).to.eql(true);
        expect(capabilities.canCloseJob).to.eql(true);
        expect(capabilities.canUpdateJob).to.eql(true);
        expect(capabilities.canForecastJob).to.eql(true);
        expect(capabilities.canCreateDatafeed).to.eql(true);
        expect(capabilities.canDeleteDatafeed).to.eql(true);
        expect(capabilities.canStartStopDatafeed).to.eql(true);
        expect(capabilities.canUpdateDatafeed).to.eql(true);
        expect(capabilities.canPreviewDatafeed).to.eql(true);
        expect(capabilities.canGetFilters).to.eql(true);
        expect(capabilities.canCreateCalendar).to.eql(true);
        expect(capabilities.canDeleteCalendar).to.eql(true);
        expect(capabilities.canCreateFilter).to.eql(true);
        expect(capabilities.canDeleteFilter).to.eql(true);
        expect(capabilities.canCreateDataFrameAnalytics).to.eql(true);
        expect(capabilities.canDeleteDataFrameAnalytics).to.eql(true);
        expect(capabilities.canStartStopDataFrameAnalytics).to.eql(true);
        expect(capabilities.canCreateMlAlerts).to.eql(true);
        expect(capabilities.canAccessML).to.eql(true);
        expect(capabilities.canGetJobs).to.eql(true);
        expect(capabilities.canGetDatafeeds).to.eql(true);
        expect(capabilities.canGetCalendars).to.eql(true);
        expect(capabilities.canFindFileStructure).to.eql(true);
        expect(capabilities.canGetDataFrameAnalytics).to.eql(true);
        expect(capabilities.canGetAnnotations).to.eql(true);
        expect(capabilities.canCreateAnnotation).to.eql(true);
        expect(capabilities.canDeleteAnnotation).to.eql(true);
      });

      it('should get power user capabilities - space without ML', async () => {
        const { capabilities } = await runRequest(USER.ML_POWERUSER, idSpaceNoMl);

        expect(capabilities.canCreateJob).to.eql(false);
        expect(capabilities.canDeleteJob).to.eql(false);
        expect(capabilities.canOpenJob).to.eql(false);
        expect(capabilities.canCloseJob).to.eql(false);
        expect(capabilities.canUpdateJob).to.eql(false);
        expect(capabilities.canForecastJob).to.eql(false);
        expect(capabilities.canCreateDatafeed).to.eql(false);
        expect(capabilities.canDeleteDatafeed).to.eql(false);
        expect(capabilities.canStartStopDatafeed).to.eql(false);
        expect(capabilities.canUpdateDatafeed).to.eql(false);
        expect(capabilities.canPreviewDatafeed).to.eql(false);
        expect(capabilities.canGetFilters).to.eql(false);
        expect(capabilities.canCreateCalendar).to.eql(false);
        expect(capabilities.canDeleteCalendar).to.eql(false);
        expect(capabilities.canCreateFilter).to.eql(false);
        expect(capabilities.canDeleteFilter).to.eql(false);
        expect(capabilities.canCreateDataFrameAnalytics).to.eql(false);
        expect(capabilities.canDeleteDataFrameAnalytics).to.eql(false);
        expect(capabilities.canStartStopDataFrameAnalytics).to.eql(false);
        expect(capabilities.canCreateMlAlerts).to.eql(false);
        expect(capabilities.canAccessML).to.eql(false);
        expect(capabilities.canGetJobs).to.eql(false);
        expect(capabilities.canGetDatafeeds).to.eql(false);
        expect(capabilities.canGetCalendars).to.eql(false);
        expect(capabilities.canFindFileStructure).to.eql(false);
        expect(capabilities.canGetDataFrameAnalytics).to.eql(false);
        expect(capabilities.canGetAnnotations).to.eql(false);
        expect(capabilities.canCreateAnnotation).to.eql(false);
        expect(capabilities.canDeleteAnnotation).to.eql(false);
      });
    });
  });
};
