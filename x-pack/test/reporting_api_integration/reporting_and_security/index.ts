/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { FtrProviderContext } from '../ftr_provider_context';

// eslint-disable-next-line import/no-default-export
export default function ({ getService, loadTestFile }: FtrProviderContext) {
  describe('Reporting APIs', function () {
    before(async () => {
      const reportingAPI = getService('reportingAPI');
      await reportingAPI.logTaskManagerHealth();
      await reportingAPI.createDataAnalystRole();
      await reportingAPI.createTestReportingUserRole();
      await reportingAPI.createDataAnalyst();
      await reportingAPI.createTestReportingUser();
    });

    loadTestFile(require.resolve('./bwc_existing_indexes'));
    loadTestFile(require.resolve('./security_roles_privileges'));
    loadTestFile(require.resolve('./generate_csv_discover'));
    loadTestFile(require.resolve('./csv_v2'));
    loadTestFile(require.resolve('./csv_v2_esql'));
    loadTestFile(require.resolve('./network_policy'));
    loadTestFile(require.resolve('./spaces'));
    loadTestFile(require.resolve('./ilm_migration_apis'));
    loadTestFile(require.resolve('./error_codes'));
    loadTestFile(require.resolve('./validation'));
  });
}

export const createPdfV2Params = (testWidth: number | string, layoutId = 'preserve_layout') =>
  `(browserTimezone:UTC,layout:` +
  `(dimensions:(height:1492,width:${testWidth}),id:${layoutId}),` +
  `locatorParams:\u0021((id:DASHBOARD_APP_LOCATOR,params:` +
  `(dashboardId:\'6c263e00-1c6d-11ea-a100-8589bb9d7c6b\',` +
  `preserveSavedFilters:\u0021t,` +
  `timeRange:(from:\'2019-03-23T03:06:17.785Z\',to:\'2019-10-04T02:33:16.708Z\'),` +
  `useHash:\u0021f,` +
  `viewMode:view),` +
  `version:\'8.2.0\')),` +
  `objectType:dashboard,` +
  `title:\'Ecom Dashboard\',` +
  `version:\'8.2.0\')`;

export const createPngV2Params = (testWidth: number | string) =>
  `(browserTimezone:UTC,layout:` +
  `(dimensions:(height:648,width:${testWidth}),id:preserve_layout),` +
  `locatorParams:(id:VISUALIZE_APP_LOCATOR,params:` +
  `(filters:\u0021(),` +
  `indexPattern:\'5193f870-d861-11e9-a311-0fa548c5f953\',` +
  `linked:\u0021t,` +
  `query:(language:kuery,query:\'\'),` +
  `savedSearchId:\'6091ead0-1c6d-11ea-a100-8589bb9d7c6b\',` +
  `timeRange:(from:\'2019-03-23T03:06:17.785Z\',to:\'2019-10-04T02:33:16.708Z\'),` +
  `uiState:(),` +
  `vis:(aggs:\u0021((enabled:\u0021t,id:\'1\',params:(emptyAsNull:\u0021f),schema:metric,type:count),` +
  `(enabled:\u0021t,` +
  `id:\'2\',` +
  `params:(field:customer_first_name.keyword,missingBucket:\u0021f,missingBucketLabel:Missing,order:desc,orderBy:\'1\',otherBucket:\u0021f,otherBucketLabel:Other,size:10),` +
  `schema:segment,type:terms)),` +
  `params:(maxFontSize:72,minFontSize:18,orientation:single,palette:(name:kibana_palette,type:palette),scale:linear,showLabel:\u0021t),` +
  `title:\'Tag Cloud of Names\',` +
  `type:tagcloud),` +
  `visId:\'1bba55f0-507e-11eb-9c0d-97106882b997\'),` +
  `version:\'8.2.0\'),` +
  `objectType:visualization,` +
  `title:\'Tag Cloud of Names\',` +
  `version:\'8.2.0\')`;
