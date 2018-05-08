/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import expect from 'expect.js';
import { indexTimestamp } from '../../../../plugins/reporting/server/lib/esqueue/helpers/index_timestamp';

function removeWhitespace(str) {
  return str.replace(/\s/g, '');
}

export default function ({ getService }) {
  const supertest = getService('supertest');
  const esSupertest = getService('esSupertest');
  const esArchiver = getService('esArchiver');
  const log = getService('log');

  async function waitForJobToFinish(downloadReportPath) {
    const PDF_IS_PENDING_CODE = 503;

    const statusCode = await new Promise(resolve => {
      const intervalId = setInterval(async () => {

        const response = await supertest
          .get(downloadReportPath)
          .responseType('blob')
          .set('kbn-xsrf', 'xxx');
        log.debug(`Report at path ${downloadReportPath} returned code ${response.statusCode}`);
        if (response.statusCode !== PDF_IS_PENDING_CODE) {
          clearInterval(intervalId);
          resolve(response.statusCode);
        }
      }, 1500);
    });

    expect(statusCode).to.be(200);
  }

  describe('generate pdf API', () => {
    let downloadReportPath;
    let completedReportCount;

    before('load reporting archive', async () => {
      await esArchiver.load('reporting/6_2');

      // If we don't include this archive, the report would generate visualizations with no data. It's included
      // here, even though we can't verify how the visualizations actually look, because the existence of data
      // means more code paths are tested. Cnsider the bug we ran into when a const keyword remained in an untranspiled
      // file. It's possible that without data, the flow of control would never have run into that keyword.
      await esArchiver.load('logstash_functional');

      const { body } = await supertest
        .get('/api/_kibana/v1/stats')
        .set('kbn-xsrf', 'xxx')
        .expect(200);
      completedReportCount = body.reporting.status.completed;
    });

    after(async () => {
      await esArchiver.unload('reporting/6_2');
      await esArchiver.unload('logstash_functional');
    });

    describe('with an existing reporting index', async () => {
      let timestampForIndex;
      let stats;
      // The index name in the 6_2 archive.
      const ARCHIVED_REPORTING_INDEX = '.reporting-2018.03.11';

      // Adding an index alias coerces the report to be generated on an existing index which means any new
      // index schema won't be applied. This is important if a point release updated the schema. Reports may still
      // be inserted into an existing index before the new schema is applied.
      before('add index alias', async () => {
        timestampForIndex = indexTimestamp('week', '.');
        await esSupertest
          .post('/_aliases')
          .send({
            actions: [
              {
                add: { index: ARCHIVED_REPORTING_INDEX, alias: `.reporting-${timestampForIndex}` }
              }
            ]
          })
          .expect(200);
      });

      after('remove index alias', async () => {
        await esSupertest
          .post('/_aliases')
          .send({
            actions: [
              {
                remove: { index: ARCHIVED_REPORTING_INDEX, alias: `.reporting-${timestampForIndex}` }
              }
            ]
          })
          .expect(200);
      });

      it('successfully posts a visualization print layout pdf job url generated from v6.2', async () => {
        // Grabbed from a report generation url from 6.2
        const jobParams = removeWhitespace(`
          (browserTimezone:America%2FNew_York,layout:(id:print),
          objectType:visualization,queryString:%27_g%3D(refreshInterval:(display:Off,pause:!!f,value:0),
          time:(from:!%272015-09-19T00:02:06.633Z!%27,interval:auto,mode:absolute,timezone:America%252FNew_York,
          to:!%272015-09-24T06:40:33.165Z!%27))%26_a%3D(filters:!!(),linked:!!f,query:(language:lucene,query:!%27!%27),
          uiState:(vis:(defaultColors:(!%270%2B-%2B1!%27:!%27rgb(247,252,245)!%27,!%271%2B-%2B2!%27:!%27rgb(199,233,192)
          !%27,!%272%2B-%2B3!%27:!%27rgb(116,196,118)!%27,!%273%2B-%2B3!%27:!%27rgb(35,139,69)!%27))),
          vis:(aggs:!!((enabled:!!t,id:!%271!%27,params:(),schema:metric,type:count),(enabled:!!t,id:!%272!%27,
          params:(field:bytes,missingBucket:!!f,missingBucketLabel:Missing,order:desc,orderBy:!%271!%27,
          otherBucket:!!f,otherBucketLabel:Other,size:5),schema:segment,type:terms),(enabled:!!t,id:!%273!%27,
          params:(field:ip,missingBucket:!!f,missingBucketLabel:Missing,order:desc,orderBy:!%271!%27,
          otherBucket:!!f,otherBucketLabel:Other,size:5),schema:group,type:terms)),params:(addLegend:!!t,
          addTooltip:!!t,colorSchema:Greens,colorsNumber:4,colorsRange:!!(),enableHover:!!f,invertColors:!!f,
          legendPosition:right,percentageMode:!!f,setColorRange:!!f,times:!!(),type:heatmap,
          valueAxes:!!((id:ValueAxis-1,labels:(color:%2523555,rotate:0,show:!!f),scale:(defaultYExtents:!!f,
          type:linear),show:!!f,type:value))),title:!%27bytes%2Bheatmap!%27,type:heatmap))%27,
          savedObjectId:dae7e680-2891-11e8-88fd-5754aa989b85)`);

        const { body } = await supertest
          .post(`/api/reporting/generate/printablePdf?jobParams=${jobParams}`)
          .set('kbn-xsrf', 'xxx')
          .expect(200);
        downloadReportPath = body.path;
      });

      it('report completes', async () => {
        await waitForJobToFinish(downloadReportPath);
      }).timeout(540000);

      it('successful job marked as completed', async () => {
        const { body } = await supertest
          .get(`/api/_kibana/v1/stats`)
          .set('kbn-xsrf', 'xxx')
          .expect(200);
        stats = body;
        completedReportCount++;
        expect(stats.reporting.status.completed).to.be(completedReportCount);
      });

      // These are new stats as of v6.3 so these numbers won't include any of the reports already in the archive. Hence,
      // these values won't add up to stats.reporting.status.completed.
      it('1 count for visualize app', async () => {
        expect(stats.reporting.lastDay.printable_pdf.app.visualization).to.be(1);
        expect(stats.reporting.last7Days.printable_pdf.app.visualization).to.be(1);
        expect(stats.reporting.printable_pdf.app.visualization).to.be(1);
      });

      it('0 counts for dashboard app', async () => {
        expect(stats.reporting.lastDay.printable_pdf.app.dashboard).to.be(0);
        expect(stats.reporting.last7Days.printable_pdf.app.dashboard).to.be(0);
        expect(stats.reporting.printable_pdf.app.dashboard).to.be(0);
      });

      it('0 counts for preserve layout', async () => {
        expect(stats.reporting.lastDay.printable_pdf.layout.preserve_layout).to.be(0);
        expect(stats.reporting.last7Days.printable_pdf.layout.preserve_layout).to.be(0);
        expect(stats.reporting.printable_pdf.layout.preserve_layout).to.be(0);
      });

      it('1 count for print layout', async () => {
        expect(stats.reporting.lastDay.printable_pdf.layout.print).to.be(1);
        expect(stats.reporting.last7Days.printable_pdf.layout.print).to.be(1);
        expect(stats.reporting.printable_pdf.layout.print).to.be(1);
      });

      it('successfully posts a dashboard preview layout pdf job url generated from v6.2', async () => {
        // Grabbed from a report generation url from 6.2
        const jobParams = removeWhitespace(`
          (browserTimezone:America%2FNew_York,layout:(dimensions:(height:656,width:1504),id:preserve_layout),
          objectType:dashboard,queryString:%27_g%3D(refreshInterval:(display:Off,pause:!!f,value:0),
          time:(from:!%272015-09-19T00:02:06.633Z!%27,interval:auto,mode:absolute,timezone:America%252FNew_York,
          to:!%272015-09-24T06:40:33.165Z!%27))%26_a%3D(description:!%27!%27,filters:!!(),fullScreenMode:!!f,
          options:(darkTheme:!!f,hidePanelTitles:!!f,useMargins:!!t),panels:!!((gridData:(h:3,i:!%271!%27,w:6,x:0,y:0),
          id:Visualization-PieChart,panelIndex:!%271!%27,type:visualization,version:!%276.2.3!%27),
          (gridData:(h:3,i:!%272!%27,w:6,x:6,y:0),id:Visualization-MetricChart,panelIndex:!%272!%27,
          type:visualization,version:!%276.2.3!%27),(gridData:(h:3,i:!%273!%27,w:6,x:0,y:3),
          id:Visualization%25E2%2598%25BA-VerticalBarChart,panelIndex:!%273!%27,type:visualization,
          version:!%276.2.3!%27),(gridData:(h:3,i:!%274!%27,w:6,x:6,y:3),id:e495f810-2892-11e8-88fd-5754aa989b85,
          panelIndex:!%274!%27,type:search,version:!%276.2.3!%27)),query:(language:lucene,query:!%27!%27),
          timeRestore:!!t,title:!%27Small%2BReporting%2BDashboard!%27,viewMode:view)%27,
          savedObjectId:%276799db00-2893-11e8-88fd-5754aa989b85%27)`);
        const { body } = await supertest
          .post(`/api/reporting/generate/printablePdf?jobParams=${jobParams}`)
          .set('kbn-xsrf', 'xxx')
          .expect(200);

        downloadReportPath = body.path;
      });

      it('report completes', async () => {
        await waitForJobToFinish(downloadReportPath);
      }).timeout(540000);

      describe('stats updated', async () => {
        it('with count of completed reports', async () => {
          const { body } = await supertest
            .get(`/api/_kibana/v1/stats`)
            .set('kbn-xsrf', 'xxx')
            .expect(200);
          stats = body;
          completedReportCount++;
          expect(stats.reporting.status.completed).to.be(completedReportCount);
        });

        it('with 1 count for dashboard app', async () => {
          expect(stats.reporting.lastDay.printable_pdf.app.dashboard).to.be(1);
          expect(stats.reporting.last7Days.printable_pdf.app.dashboard).to.be(1);
          expect(stats.reporting.printable_pdf.app.dashboard).to.be(1);
        });

        it('with 1 count for preserve layout', async () => {
          expect(stats.reporting.lastDay.printable_pdf.layout.preserve_layout).to.be(1);
          expect(stats.reporting.last7Days.printable_pdf.layout.preserve_layout).to.be(1);
          expect(stats.reporting.printable_pdf.layout.preserve_layout).to.be(1);
        });
      });
    });

    describe('with a new reporting index', async () => {
      let timestampForIndex;
      let stats;

      before('delete any existing index alias', async () => {
        timestampForIndex = indexTimestamp('week', '.');
        await esSupertest
          .delete(`/.reporting-${timestampForIndex}`);
      });

      after('delete new reporting indexes', async () => {
        await esSupertest
          .delete(`/.reporting-${timestampForIndex}`);
      });

      it('successfully posts a visualization print layout pdf job url generated from v6.2', async () => {
        // Grabbed from a report generation url from 6.2
        const jobParams = removeWhitespace(`
          (browserTimezone:America%2FNew_York,layout:(id:print),
          objectType:visualization,queryString:%27_g%3D(refreshInterval:(display:Off,pause:!!f,value:0),
          time:(from:!%272015-09-19T00:02:06.633Z!%27,interval:auto,mode:absolute,timezone:America%252FNew_York,
          to:!%272015-09-24T06:40:33.165Z!%27))%26_a%3D(filters:!!(),linked:!!f,query:(language:lucene,query:!%27!%27),
          uiState:(vis:(defaultColors:(!%270%2B-%2B1!%27:!%27rgb(247,252,245)!%27,!%271%2B-%2B2!%27:!%27rgb(199,233,192)
          !%27,!%272%2B-%2B3!%27:!%27rgb(116,196,118)!%27,!%273%2B-%2B3!%27:!%27rgb(35,139,69)!%27))),
          vis:(aggs:!!((enabled:!!t,id:!%271!%27,params:(),schema:metric,type:count),(enabled:!!t,id:!%272!%27,
          params:(field:bytes,missingBucket:!!f,missingBucketLabel:Missing,order:desc,orderBy:!%271!%27,
          otherBucket:!!f,otherBucketLabel:Other,size:5),schema:segment,type:terms),(enabled:!!t,id:!%273!%27,
          params:(field:ip,missingBucket:!!f,missingBucketLabel:Missing,order:desc,orderBy:!%271!%27,
          otherBucket:!!f,otherBucketLabel:Other,size:5),schema:group,type:terms)),params:(addLegend:!!t,
          addTooltip:!!t,colorSchema:Greens,colorsNumber:4,colorsRange:!!(),enableHover:!!f,invertColors:!!f,
          legendPosition:right,percentageMode:!!f,setColorRange:!!f,times:!!(),type:heatmap,
          valueAxes:!!((id:ValueAxis-1,labels:(color:%2523555,rotate:0,show:!!f),scale:(defaultYExtents:!!f,
          type:linear),show:!!f,type:value))),title:!%27bytes%2Bheatmap!%27,type:heatmap))%27,
          savedObjectId:dae7e680-2891-11e8-88fd-5754aa989b85)`);
        const { body } = await supertest
          .post(`/api/reporting/generate/printablePdf?jobParams=${jobParams}`)
          .set('kbn-xsrf', 'xxx')
          .expect(200);

        downloadReportPath = body.path;
      });

      it('report completes', async () => {
        await waitForJobToFinish(downloadReportPath);
      });

      describe('stats updated', async () => {
        it('with count of completed reports', async () => {
          const { body } = await supertest
            .get(`/api/_kibana/v1/stats`)
            .set('kbn-xsrf', 'xxx')
            .expect(200);
          stats = body;
          completedReportCount++;
          expect(stats.reporting.status.completed).to.be(completedReportCount);
        });

        it('with 2 counts for visualize app', async () => {
          expect(stats.reporting.lastDay.printable_pdf.app.visualization).to.be(2);
          expect(stats.reporting.last7Days.printable_pdf.app.visualization).to.be(2);
          expect(stats.reporting.printable_pdf.app.visualization).to.be(2);
        });

        it('with 2 counts for print layout', async () => {
          expect(stats.reporting.lastDay.printable_pdf.layout.print).to.be(2);
          expect(stats.reporting.last7Days.printable_pdf.layout.print).to.be(2);
          expect(stats.reporting.printable_pdf.layout.print).to.be(2);
        });
      });
    });
  });
}
