/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import expect from '@kbn/expect';
import { FtrProviderContext } from '../ftr_provider_context';

// eslint-disable-next-line import/no-default-export
export default function ({ getService }: FtrProviderContext) {
  const esArchiver = getService('esArchiver');
  const reportingAPI = getService('reportingAPI');
  const retry = getService('retry');
  const supertest = getService('supertest');
  const archive = 'reporting/canvas_disallowed_url';

  /*
   * The Reporting API Functional Test config implements a network policy that
   * is designed to disallow the following Canvas worksheet
   */
  describe('Network Policy', () => {
    before(async () => {
      await esArchiver.load(archive); // includes a canvas worksheet with an offending image URL
    });

    after(async () => {
      await esArchiver.unload(archive);
    });

    it('should fail job when page voilates the network policy', async () => {
      const downloadPath = await reportingAPI.postJob(
        `/api/reporting/generate/printablePdf?jobParams=(layout:(dimensions:(height:720,width:1080),id:preserve_layout),objectType:'canvas%20workpad',relativeUrls:!(%2Fapp%2Fcanvas%23%2Fexport%2Fworkpad%2Fpdf%2Fworkpad-e7464259-0b75-4b8c-81c8-8422b15ff201%2Fpage%2F1),title:'My%20Canvas%20Workpad')`
      );

      // Retry the download URL until a "failed" response status is returned
      await retry.tryForTime(120000, async () => {
        const { body } = await supertest.get(downloadPath).expect(500);
        expect(body.message).to.match(/Reporting generation failed: Error:/);
      });
    });
  });
}
