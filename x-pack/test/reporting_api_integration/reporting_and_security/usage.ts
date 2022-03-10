/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import { FtrProviderContext } from '../ftr_provider_context';
import { UsageStats } from '../services/usage';

// These all have the domain name portion stripped out. The api infrastructure assumes it when we post to it anyhow.
const PDF_PRINT_DASHBOARD_6_3 =
  '/api/reporting/generate/printablePdf?jobParams=(browserTimezone:America%2FNew_York,layout:(id:print),objectType:dashboard,relativeUrls:!(%27%2Fapp%2Fkibana%23%2Fdashboard%2F2ae34a60-3dd4-11e8-b2b9-5d5dc1715159%3F_g%3D(refreshInterval:(display:Off,pause:!!f,value:0),time:(from:!%27Mon%2BApr%2B09%2B2018%2B17:56:08%2BGMT-0400!%27,mode:absolute,to:!%27Wed%2BApr%2B11%2B2018%2B17:56:08%2BGMT-0400!%27))%26_a%3D(description:!%27!%27,filters:!!(),fullScreenMode:!!f,options:(hidePanelTitles:!!f,useMargins:!!t),panels:!!((embeddableConfig:(),gridData:(h:15,i:!%271!%27,w:24,x:0,y:0),id:!%27145ced90-3dcb-11e8-8660-4d65aa086b3c!%27,panelIndex:!%271!%27,type:visualization,version:!%276.3.0!%27),(embeddableConfig:(),gridData:(h:15,i:!%272!%27,w:24,x:24,y:0),id:e2023110-3dcb-11e8-8660-4d65aa086b3c,panelIndex:!%272!%27,type:visualization,version:!%276.3.0!%27)),query:(language:lucene,query:!%27!%27),timeRestore:!!f,title:!%27couple%2Bpanels!%27,viewMode:view)%27),title:%27couple%20panels%27)';
const PDF_PRESERVE_DASHBOARD_FILTER_6_3 =
  '/api/reporting/generate/printablePdf?jobParams=(browserTimezone:America%2FNew_York,layout:(dimensions:(height:439,width:1362),id:preserve_layout),objectType:dashboard,relativeUrls:!(%27%2Fapp%2Fkibana%23%2Fdashboard%2F61c58ad0-3dd3-11e8-b2b9-5d5dc1715159%3F_g%3D(refreshInterval:(display:Off,pause:!!f,value:0),time:(from:!%27Mon%2BApr%2B09%2B2018%2B17:56:08%2BGMT-0400!%27,mode:absolute,to:!%27Wed%2BApr%2B11%2B2018%2B17:56:08%2BGMT-0400!%27))%26_a%3D(description:!%27!%27,filters:!!((!%27$state!%27:(store:appState),meta:(alias:!!n,disabled:!!f,index:a0f483a0-3dc9-11e8-8660-4d65aa086b3c,key:animal,negate:!!f,params:(query:dog,type:phrase),type:phrase,value:dog),query:(match:(animal:(query:dog,type:phrase))))),fullScreenMode:!!f,options:(hidePanelTitles:!!f,useMargins:!!t),panels:!!((embeddableConfig:(),gridData:(h:15,i:!%271!%27,w:24,x:0,y:0),id:!%2750643b60-3dd3-11e8-b2b9-5d5dc1715159!%27,panelIndex:!%271!%27,type:visualization,version:!%276.3.0!%27),(embeddableConfig:(),gridData:(h:15,i:!%272!%27,w:24,x:24,y:0),id:a16d1990-3dca-11e8-8660-4d65aa086b3c,panelIndex:!%272!%27,type:search,version:!%276.3.0!%27)),query:(language:lucene,query:!%27!%27),timeRestore:!!t,title:!%27dashboard%2Bwith%2Bfilter!%27,viewMode:view)%27),title:%27dashboard%20with%20filter%27)';
const PDF_PRESERVE_PIE_VISUALIZATION_6_3 =
  '/api/reporting/generate/printablePdf?jobParams=(browserTimezone:America%2FNew_York,layout:(dimensions:(height:441,width:1002),id:preserve_layout),objectType:visualization,relativeUrls:!(%27%2Fapp%2Fkibana%23%2Fvisualize%2Fedit%2F3fe22200-3dcb-11e8-8660-4d65aa086b3c%3F_g%3D(refreshInterval:(display:Off,pause:!!f,value:0),time:(from:!%27Mon%2BApr%2B09%2B2018%2B17:56:08%2BGMT-0400!%27,mode:absolute,to:!%27Wed%2BApr%2B11%2B2018%2B17:56:08%2BGMT-0400!%27))%26_a%3D(filters:!!(),linked:!!f,query:(language:lucene,query:!%27!%27),uiState:(),vis:(aggs:!!((enabled:!!t,id:!%271!%27,params:(),schema:metric,type:count),(enabled:!!t,id:!%272!%27,params:(field:bytes,missingBucket:!!f,missingBucketLabel:Missing,order:desc,orderBy:!%271!%27,otherBucket:!!f,otherBucketLabel:Other,size:5),schema:segment,type:terms)),params:(addLegend:!!t,addTooltip:!!t,isDonut:!!t,labels:(last_level:!!t,show:!!f,truncate:100,values:!!t),legendPosition:right,type:pie),title:!%27Rendering%2BTest:%2Bpie!%27,type:pie))%27),title:%27Rendering%20Test:%20pie%27)';
const PDF_PRINT_PIE_VISUALIZATION_FILTER_AND_SAVED_SEARCH_6_3 =
  '/api/reporting/generate/printablePdf?jobParams=(browserTimezone:America%2FNew_York,layout:(id:print),objectType:visualization,relativeUrls:!(%27%2Fapp%2Fkibana%23%2Fvisualize%2Fedit%2Fbefdb6b0-3e59-11e8-9fc3-39e49624228e%3F_g%3D(refreshInterval:(display:Off,pause:!!f,value:0),time:(from:!%27Mon%2BApr%2B09%2B2018%2B17:56:08%2BGMT-0400!%27,mode:absolute,to:!%27Wed%2BApr%2B11%2B2018%2B17:56:08%2BGMT-0400!%27))%26_a%3D(filters:!!((!%27$state!%27:(store:appState),meta:(alias:!!n,disabled:!!f,index:a0f483a0-3dc9-11e8-8660-4d65aa086b3c,key:animal.keyword,negate:!!f,params:(query:dog,type:phrase),type:phrase,value:dog),query:(match:(animal.keyword:(query:dog,type:phrase))))),linked:!!t,query:(language:lucene,query:!%27!%27),uiState:(),vis:(aggs:!!((enabled:!!t,id:!%271!%27,params:(),schema:metric,type:count),(enabled:!!t,id:!%272!%27,params:(field:name.keyword,missingBucket:!!f,missingBucketLabel:Missing,order:desc,orderBy:!%271!%27,otherBucket:!!f,otherBucketLabel:Other,size:5),schema:segment,type:terms)),params:(addLegend:!!t,addTooltip:!!t,isDonut:!!t,labels:(last_level:!!t,show:!!f,truncate:100,values:!!t),legendPosition:right,type:pie),title:!%27Filter%2BTest:%2Banimals:%2Blinked%2Bto%2Bsearch%2Bwith%2Bfilter!%27,type:pie))%27),title:%27Filter%20Test:%20animals:%20linked%20to%20search%20with%20filter%27)';
const JOB_PARAMS_CSV_DEFAULT_SPACE =
  `/api/reporting/generate/csv_searchsource?jobParams=(columns:!(order_date,category,customer_full_name,taxful_total_price,currency),objectType:search,searchSource:(fields:!((field:'*',include_unmapped:true))` +
  `,filter:!((meta:(field:order_date,index:aac3e500-f2c7-11ea-8250-fb138aa491e7,params:()),query:(range:(order_date:(format:strict_date_optional_time,gte:'2019-06-02T12:28:40.866Z'` +
  `,lte:'2019-07-18T20:59:57.136Z'))))),index:aac3e500-f2c7-11ea-8250-fb138aa491e7,parent:(filter:!(),highlightAll:!t,index:aac3e500-f2c7-11ea-8250-fb138aa491e7` +
  `,query:(language:kuery,query:''),version:!t),sort:!((order_date:desc)),trackTotalHits:!t))`;
const OSS_KIBANA_ARCHIVE_PATH = 'test/functional/fixtures/kbn_archiver/dashboard/current/kibana';
const OSS_DATA_ARCHIVE_PATH = 'test/functional/fixtures/es_archiver/dashboard/current/data';

// eslint-disable-next-line import/no-default-export
export default function ({ getService }: FtrProviderContext) {
  const esArchiver = getService('esArchiver');
  const kibanaServer = getService('kibanaServer');
  const reportingAPI = getService('reportingAPI');
  const retry = getService('retry');
  const usageAPI = getService('usageAPI');

  describe('Usage', () => {
    const deleteAllReports = () => reportingAPI.deleteAllReports();
    beforeEach(deleteAllReports);
    after(deleteAllReports);

    describe('initial state', () => {
      let usage: UsageStats;

      before(async () => {
        await retry.try(async () => {
          // use retry for stability - usage API could return 503
          usage = (await usageAPI.getUsageStats()) as UsageStats;
        });
      });

      it('shows reporting as available and enabled', async () => {
        expect(usage.reporting.available).to.be(true);
        expect(usage.reporting.enabled).to.be(true);
      });

      it('all counts are 0', async () => {
        reportingAPI.expectRecentPdfAppStats(usage, 'visualization', 0);
        reportingAPI.expectAllTimePdfAppStats(usage, 'visualization', 0);
        reportingAPI.expectRecentPdfAppStats(usage, 'dashboard', 0);
        reportingAPI.expectAllTimePdfAppStats(usage, 'dashboard', 0);
        reportingAPI.expectRecentPdfLayoutStats(usage, 'preserve_layout', 0);
        reportingAPI.expectAllTimePdfLayoutStats(usage, 'preserve_layout', 0);
        reportingAPI.expectAllTimePdfLayoutStats(usage, 'print', 0);
        reportingAPI.expectRecentPdfLayoutStats(usage, 'print', 0);
        reportingAPI.expectRecentJobTypeTotalStats(usage, 'csv_searchsource', 0);
        reportingAPI.expectAllTimeJobTypeTotalStats(usage, 'csv_searchsource', 0);
        reportingAPI.expectRecentJobTypeTotalStats(usage, 'printable_pdf', 0);
        reportingAPI.expectAllTimeJobTypeTotalStats(usage, 'printable_pdf', 0);
      });
    });

    describe('from archive data', () => {
      it('generated from 6.2', async () => {
        await esArchiver.load('x-pack/test/functional/es_archives/reporting/bwc/6_2');
        const usage = await usageAPI.getUsageStats();

        reportingAPI.expectRecentJobTypeTotalStats(usage, 'printable_pdf', 0);
        reportingAPI.expectAllTimeJobTypeTotalStats(usage, 'printable_pdf', 7);

        // These statistics weren't tracked until 6.3
        reportingAPI.expectRecentPdfAppStats(usage, 'visualization', 0);
        reportingAPI.expectRecentPdfAppStats(usage, 'dashboard', 0);
        reportingAPI.expectRecentPdfLayoutStats(usage, 'preserve_layout', 0);
        reportingAPI.expectRecentPdfLayoutStats(usage, 'print', 0);
        reportingAPI.expectAllTimePdfAppStats(usage, 'visualization', 0);
        reportingAPI.expectAllTimePdfAppStats(usage, 'dashboard', 0);
        reportingAPI.expectAllTimePdfLayoutStats(usage, 'preserve_layout', 0);
        reportingAPI.expectAllTimePdfLayoutStats(usage, 'print', 0);

        await esArchiver.unload('x-pack/test/functional/es_archives/reporting/bwc/6_2');
      });

      it('generated from 6.3', async () => {
        await esArchiver.load('x-pack/test/functional/es_archives/reporting/bwc/6_3');
        const usage = await usageAPI.getUsageStats();

        reportingAPI.expectRecentJobTypeTotalStats(usage, 'printable_pdf', 0);
        reportingAPI.expectRecentPdfAppStats(usage, 'visualization', 0);
        reportingAPI.expectRecentPdfAppStats(usage, 'dashboard', 0);
        reportingAPI.expectRecentPdfLayoutStats(usage, 'preserve_layout', 0);
        reportingAPI.expectRecentPdfLayoutStats(usage, 'print', 0);

        reportingAPI.expectAllTimeJobTypeTotalStats(usage, 'printable_pdf', 12);
        reportingAPI.expectAllTimePdfAppStats(usage, 'visualization', 3);
        reportingAPI.expectAllTimePdfAppStats(usage, 'dashboard', 3);
        reportingAPI.expectAllTimePdfLayoutStats(usage, 'preserve_layout', 3);
        reportingAPI.expectAllTimePdfLayoutStats(usage, 'print', 3);

        await esArchiver.unload('x-pack/test/functional/es_archives/reporting/bwc/6_3');
      });
    });

    describe('from new jobs posted', () => {
      before(async () => {
        await kibanaServer.savedObjects.cleanStandardList();
        await kibanaServer.importExport.load(OSS_KIBANA_ARCHIVE_PATH);
        await esArchiver.load(OSS_DATA_ARCHIVE_PATH);
        await reportingAPI.initEcommerce();
      });

      after(async () => {
        await kibanaServer.savedObjects.cleanStandardList();
        await esArchiver.unload(OSS_DATA_ARCHIVE_PATH);
        await reportingAPI.teardownEcommerce();
      });

      it('should handle csv_searchsource', async () => {
        await reportingAPI.expectAllJobsToFinishSuccessfully(
          await Promise.all([reportingAPI.postJob(JOB_PARAMS_CSV_DEFAULT_SPACE)])
        );

        const usage = await usageAPI.getUsageStats();
        reportingAPI.expectRecentPdfAppStats(usage, 'visualization', 0);
        reportingAPI.expectRecentPdfAppStats(usage, 'dashboard', 0);
        reportingAPI.expectRecentPdfLayoutStats(usage, 'preserve_layout', 0);
        reportingAPI.expectRecentPdfLayoutStats(usage, 'print', 0);
        reportingAPI.expectRecentJobTypeTotalStats(usage, 'csv_searchsource', 1);
        reportingAPI.expectRecentJobTypeTotalStats(usage, 'printable_pdf', 0);
      });

      it('should handle preserve_layout pdf', async () => {
        await reportingAPI.expectAllJobsToFinishSuccessfully(
          await Promise.all([
            reportingAPI.postJob(PDF_PRESERVE_DASHBOARD_FILTER_6_3),
            reportingAPI.postJob(PDF_PRESERVE_PIE_VISUALIZATION_6_3),
          ])
        );

        const usage = await usageAPI.getUsageStats();
        reportingAPI.expectRecentPdfAppStats(usage, 'visualization', 1);
        reportingAPI.expectRecentPdfAppStats(usage, 'dashboard', 1);
        reportingAPI.expectRecentPdfLayoutStats(usage, 'preserve_layout', 2);
        reportingAPI.expectRecentPdfLayoutStats(usage, 'print', 0);
        reportingAPI.expectRecentJobTypeTotalStats(usage, 'csv_searchsource', 0);
        reportingAPI.expectRecentJobTypeTotalStats(usage, 'printable_pdf', 2);
      });

      it('should handle print_layout pdf', async () => {
        await reportingAPI.expectAllJobsToFinishSuccessfully(
          await Promise.all([
            reportingAPI.postJob(PDF_PRINT_DASHBOARD_6_3),
            reportingAPI.postJob(PDF_PRINT_PIE_VISUALIZATION_FILTER_AND_SAVED_SEARCH_6_3),
          ])
        );

        const usage = await usageAPI.getUsageStats();
        reportingAPI.expectRecentPdfAppStats(usage, 'visualization', 1);
        reportingAPI.expectRecentPdfAppStats(usage, 'dashboard', 1);
        reportingAPI.expectRecentPdfLayoutStats(usage, 'preserve_layout', 0);
        reportingAPI.expectRecentPdfLayoutStats(usage, 'print', 2);
        reportingAPI.expectRecentJobTypeTotalStats(usage, 'csv_searchsource', 0);
        reportingAPI.expectRecentJobTypeTotalStats(usage, 'printable_pdf', 2);

        reportingAPI.expectAllTimePdfAppStats(usage, 'visualization', 1);
        reportingAPI.expectAllTimePdfAppStats(usage, 'dashboard', 1);
        reportingAPI.expectAllTimePdfLayoutStats(usage, 'preserve_layout', 0);
        reportingAPI.expectAllTimePdfLayoutStats(usage, 'print', 2);
        reportingAPI.expectAllTimeJobTypeTotalStats(usage, 'csv_searchsource', 0);
        reportingAPI.expectAllTimeJobTypeTotalStats(usage, 'printable_pdf', 2);
      });
    });
  });
}
