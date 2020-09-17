/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import expect from '@kbn/expect';
import * as Rx from 'rxjs';
import { filter, first, map, switchMap, tap, timeout } from 'rxjs/operators';
import { FtrProviderContext } from '../ftr_provider_context';

// eslint-disable-next-line import/no-default-export
export default function ({ getService }: FtrProviderContext) {
  const esArchiver = getService('esArchiver');
  const reportingAPI = getService('reportingAPI');
  const supertest = getService('supertest');
  const log = getService('log');

  const getCompleted$ = (downloadPath: string) => {
    return Rx.interval(2000).pipe(
      tap(() => log.debug(`checking report status at ${downloadPath}...`)),
      switchMap(() => supertest.get(downloadPath)),
      filter(({ status: statusCode }) => statusCode === 200),
      tap(() => log.debug(`report at ${downloadPath} is done`)),
      map((response) => response.text),
      first(),
      timeout(15000)
    );
  };

  describe('Exports from Non-default Space', () => {
    before(async () => {
      await esArchiver.load('reporting/ecommerce');
      await esArchiver.load('reporting/ecommerce_kibana_spaces'); // dashboard in non default space
    });

    after(async () => {
      await esArchiver.unload('reporting/ecommerce');
      await esArchiver.unload('reporting/ecommerce_kibana_spaces');
    });

    afterEach(async () => {
      await reportingAPI.deleteAllReports();
    });

    it('should complete a job of CSV saved search export in non-default space', async () => {
      const downloadPath = await reportingAPI.postJobJSON(
        `/s/non_default_space/api/reporting/generate/csv`,
        {
          jobParams:
            `(browserTimezone:UTC,conflictedTypesFields:!(),fields:!(order_date,category,customer_first_name,customer_full_name,total_quantity,total_unique_products,taxless_total_price,taxful_total_price,currency),indexPatternId:'067dec90-e7ee-11ea-a730-d58e9ea7581b',metaFields:!(_source,_id,_type,_index,_score),objectType:search,searchRequest:(body:(_source:(includes:!(order_date,category,customer_first_name,customer_full_name,total_quantity,total_unique_products,taxless_total_price,taxful_total_price,currency)),docvalue_fields:!((field:order_date,format:date_time)),query:(bool:(filter:!((match_all:()),(range:(order_date:(format:strict_date_optional_time,gte:'2019-06-11T08:24:16.425Z',lte:'2019-07-13T09:31:07.520Z')))),must:!(),must_not:!(),should:!())),script_fields:(),` +
            `sort:!((order_date:(order:desc,unmapped_type:boolean))),stored_fields:!(order_date,category,customer_first_name,customer_full_name,total_quantity,total_unique_products,taxless_total_price,taxful_total_price,currency),version:!t),index:'ecommerce*'),title:'Ecom Search')`,
        }
      );

      const completed$ = getCompleted$(downloadPath);
      const reportCompleted = await completed$.toPromise();
      expect(reportCompleted).to.match(
        /^"order_date";category;"customer_first_name";"customer_full_name";"total_quantity";"total_unique_products";"taxless_total_price";"taxful_total_price";currency\n"Jul 12, 2019 @ 00:00:00.000";/
      ); // UTC timezone, semicolon separator
    });

    it('uses the default space settings', async () => {
      // MUST NOT have time zone field in the params for space setting to take effect
      const defaultSpaceJob = await reportingAPI.postJobJSON(`/api/reporting/generate/csv`, {
        jobParams: `(conflictedTypesFields:!(),fields:!(order_date,order_date,customer_full_name,taxful_total_price),indexPatternId:aac3e500-f2c7-11ea-8250-fb138aa491e7,metaFields:!(_source,_id,_type,_index,_score),objectType:search,searchRequest:(body:(_source:(includes:!(order_date,customer_full_name,taxful_total_price)),docvalue_fields:!((field:order_date,format:date_time)),query:(bool:(filter:!((match_all:()),(range:(order_date:(format:strict_date_optional_time,gte:'2019-06-11T04:49:43.495Z',lte:'2019-07-14T10:25:34.149Z')))),must:!(),must_not:!(),should:!())),script_fields:(),sort:!((order_date:(order:desc,unmapped_type:boolean))),stored_fields:!(order_date,customer_full_name,taxful_total_price),version:!t),index:'ec*'),title:'EC SEARCH')`,
      });

      const defaultCompleted$ = getCompleted$(defaultSpaceJob);
      const defaultReport = await defaultCompleted$.toPromise();
      expect(defaultReport).to.match(
        /^"order_date","order_date","customer_full_name","taxful_total_price"\n"Jul 12, 2019 @ 00:00:00.000","Jul 12, 2019 @ 00:00:00.000","Sultan Al Boone","173.96"/
      ); // UTC timezone, comma separator
    });

    it(`uses browserTimezone in jobParams override space setting`, async () => {
      // MUST have time zone field in the params and timezone set to `Browser` in Advanced Settings
      const timezoneParamsJob = await reportingAPI.postJobJSON(`/api/reporting/generate/csv`, {
        jobParams:
          `(browserTimezone:America/Phoenix,conflictedTypesFields:!(),fields:!(order_date,category,customer_full_name,taxful_total_price,currency),indexPatternId:aac3e500-f2c7-11ea-8250-fb138aa491e7,metaFields:!(_source,_id,_type,_index,_score),objectType:search,searchRequest:(body:(_source:(includes:!(order_date,category,customer_full_name,taxful_total_price,currency)),docvalue_fields:!((field:order_date,format:date_time)),query:(bool:(filter:!((match_all:()),(range:(order_date:(format:strict_date_optional_time,gte:'2019-05-30T05:09:59.743Z',lte:'2019-07-26T08:47:09.682Z')))),must:!(),must_not:!(),should:!())),script_fields:(),sort:!((order_date:(order:desc,unmapped_type:boolean))),stored_fields:!(order_date,category,customer_full_name,taxful_total_price,currency),` +
          `version:!t),index:'ec*'),title:'EC SEARCH from DEFAULT')`,
      });

      const completed$ = getCompleted$(timezoneParamsJob);
      const report = await completed$.toPromise();
      expect(report).to.match(
        /^"order_date",category,"customer_full_name","taxful_total_price",currency\n"Jul 11, 2019 @ 17:00:00.000"/
      );
    });

    // FLAKY: https://github.com/elastic/kibana/issues/76551
    it.skip('should complete a job of PNG export of a dashboard in non-default space', async () => {
      const downloadPath = await reportingAPI.postJobJSON(
        `/s/non_default_space/api/reporting/generate/png`,
        {
          jobParams: `(browserTimezone:UTC,layout:(dimensions:(height:512,width:2402),id:png),objectType:dashboard,relativeUrl:'/s/non_default_space/app/dashboards#/view/3c9ee360-e7ee-11ea-a730-d58e9ea7581b?_g=(filters:!!(),refreshInterval:(pause:!!t,value:0),time:(from:!'2019-06-10T03:17:28.800Z!',to:!'2019-07-14T19:25:06.385Z!'))&_a=(description:!'!',filters:!!(),fullScreenMode:!!f,options:(hidePanelTitles:!!f,useMargins:!!t),query:(language:kuery,query:!'!'),timeRestore:!!t,title:!'Ecom%20Dashboard%20Non%20Default%20Space!',viewMode:view)',title:'Ecom Dashboard Non Default Space')`,
        }
      );

      const completed$: Rx.Observable<string> = getCompleted$(downloadPath);
      const reportCompleted = await completed$.toPromise();
      expect(reportCompleted).to.not.be(null);
    });

    // FLAKY: https://github.com/elastic/kibana/issues/76551
    it.skip('should complete a job of PDF export of a dashboard in non-default space', async () => {
      const downloadPath = await reportingAPI.postJobJSON(
        `/s/non_default_space/api/reporting/generate/printablePdf`,
        {
          jobParams: `(browserTimezone:UTC,layout:(dimensions:(height:512,width:2402),id:preserve_layout),objectType:dashboard,relativeUrls:!('/s/non_default_space/app/dashboards#/view/3c9ee360-e7ee-11ea-a730-d58e9ea7581b?_g=(filters:!!(),refreshInterval:(pause:!!t,value:0),time:(from:!'2019-06-10T03:17:28.800Z!',to:!'2019-07-14T19:25:06.385Z!'))&_a=(description:!'!',filters:!!(),fullScreenMode:!!f,options:(hidePanelTitles:!!f,useMargins:!!t),query:(language:kuery,query:!'!'),timeRestore:!!t,title:!'Ecom%20Dashboard%20Non%20Default%20Space!',viewMode:view)'),title:'Ecom Dashboard Non Default Space')`,
        }
      );

      const completed$ = getCompleted$(downloadPath);
      const reportCompleted = await completed$.toPromise();
      expect(reportCompleted).to.not.be(null);
    });
  });
}
