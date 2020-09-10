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
      const downloadPath = await reportingAPI.postJob(
        `/s/non_default_space/api/reporting/generate/csv?jobParams=%28browserTimezone%3AUTC%2CconflictedTypesFields%3A%21%28%29%2Cfields%3A%21%28order_date%2Ccategory%2Ccustomer_first_name%2Ccustomer_full_name%2Ctotal_quantity%2Ctotal_unique_products%2Ctaxless_total_price%2Ctaxful_total_price%2Ccurrency%29%2CindexPatternId%3A%27067dec90-e7ee-11ea-a730-d58e9ea7581b%27%2CmetaFields%3A%21%28_source%2C_id%2C_type%2C_index%2C_score%29%2CobjectType%3Asearch%2CsearchRequest%3A%28body%3A%28_source%3A%28includes%3A%21%28order_date%2Ccategory%2Ccustomer_first_name%2Ccustomer_full_name%2Ctotal_quantity%2Ctotal_unique_products%2Ctaxless_total_price%2Ctaxful_total_price%2Ccurrency%29%29%2Cdocvalue_fields%3A%21%28%28field%3Aorder_date%2Cformat%3Adate_time%29%29%2Cquery%3A%28bool%3A%28filter%3A%21%28%28match_all%3A%28%29%29%2C%28range%3A%28order_date%3A%28format%3Astrict_date_optional_time%2Cgte%3A%272019-06-11T08%3A24%3A16.425Z%27%2Clte%3A%272019-07-13T09%3A31%3A07.520Z%27%29%29%29%29%2Cmust%3A%21%28%29%2Cmust_not%3A%21%28%29%2Cshould%3A%21%28%29%29%29%2Cscript_fields%3A%28%29%2Csort%3A%21%28%28order_date%3A%28order%3Adesc%2Cunmapped_type%3Aboolean%29%29%29%2Cstored_fields%3A%21%28order_date%2Ccategory%2Ccustomer_first_name%2Ccustomer_full_name%2Ctotal_quantity%2Ctotal_unique_products%2Ctaxless_total_price%2Ctaxful_total_price%2Ccurrency%29%2Cversion%3A%21t%29%2Cindex%3A%27ecommerce%2A%27%29%2Ctitle%3A%27Ecom%20Search%27%29`
      );

      // Retry the download URL until a "completed" response status is returned
      const completed$ = getCompleted$(downloadPath);
      const reportCompleted = await completed$.toPromise();
      expect(reportCompleted).to.match(/^"order_date",/);
    });

    // FLAKY: https://github.com/elastic/kibana/issues/76551
    it.skip('should complete a job of PNG export of a dashboard in non-default space', async () => {
      const downloadPath = await reportingAPI.postJob(
        `/s/non_default_space/api/reporting/generate/png?jobParams=%28browserTimezone%3AUTC%2Clayout%3A%28dimensions%3A%28height%3A512%2Cwidth%3A2402%29%2Cid%3Apng%29%2CobjectType%3Adashboard%2CrelativeUrl%3A%27%2Fs%2Fnon_default_space%2Fapp%2Fdashboards%23%2Fview%2F3c9ee360-e7ee-11ea-a730-d58e9ea7581b%3F_g%3D%28filters%3A%21%21%28%29%2CrefreshInterval%3A%28pause%3A%21%21t%2Cvalue%3A0%29%2Ctime%3A%28from%3A%21%272019-06-10T03%3A17%3A28.800Z%21%27%2Cto%3A%21%272019-07-14T19%3A25%3A06.385Z%21%27%29%29%26_a%3D%28description%3A%21%27%21%27%2Cfilters%3A%21%21%28%29%2CfullScreenMode%3A%21%21f%2Coptions%3A%28hidePanelTitles%3A%21%21f%2CuseMargins%3A%21%21t%29%2Cquery%3A%28language%3Akuery%2Cquery%3A%21%27%21%27%29%2CtimeRestore%3A%21%21t%2Ctitle%3A%21%27Ecom%2520Dashboard%2520Non%2520Default%2520Space%21%27%2CviewMode%3Aview%29%27%2Ctitle%3A%27Ecom%20Dashboard%20Non%20Default%20Space%27%29`
      );

      const completed$: Rx.Observable<string> = getCompleted$(downloadPath);
      const reportCompleted = await completed$.toPromise();
      expect(reportCompleted).to.not.be(null);
    });

    // FLAKY: https://github.com/elastic/kibana/issues/76551
    it.skip('should complete a job of PDF export of a dashboard in non-default space', async () => {
      const downloadPath = await reportingAPI.postJob(
        `/s/non_default_space/api/reporting/generate/printablePdf?jobParams=%28browserTimezone%3AUTC%2Clayout%3A%28dimensions%3A%28height%3A512%2Cwidth%3A2402%29%2Cid%3Apreserve_layout%29%2CobjectType%3Adashboard%2CrelativeUrls%3A%21%28%27%2Fs%2Fnon_default_space%2Fapp%2Fdashboards%23%2Fview%2F3c9ee360-e7ee-11ea-a730-d58e9ea7581b%3F_g%3D%28filters%3A%21%21%28%29%2CrefreshInterval%3A%28pause%3A%21%21t%2Cvalue%3A0%29%2Ctime%3A%28from%3A%21%272019-06-10T03%3A17%3A28.800Z%21%27%2Cto%3A%21%272019-07-14T19%3A25%3A06.385Z%21%27%29%29%26_a%3D%28description%3A%21%27%21%27%2Cfilters%3A%21%21%28%29%2CfullScreenMode%3A%21%21f%2Coptions%3A%28hidePanelTitles%3A%21%21f%2CuseMargins%3A%21%21t%29%2Cquery%3A%28language%3Akuery%2Cquery%3A%21%27%21%27%29%2CtimeRestore%3A%21%21t%2Ctitle%3A%21%27Ecom%2520Dashboard%2520Non%2520Default%2520Space%21%27%2CviewMode%3Aview%29%27%29%2Ctitle%3A%27Ecom%20Dashboard%20Non%20Default%20Space%27%29`
      );

      const completed$ = getCompleted$(downloadPath);
      const reportCompleted = await completed$.toPromise();
      expect(reportCompleted).to.not.be(null);
    });
  });
}
