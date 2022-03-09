/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import { FtrProviderContext } from '../ftr_provider_context';

// This concatenates lines of multi-line string into a single line.
// It is so long strings can be entered at short widths, making syntax highlighting easier on editors
function singleLine(literals: TemplateStringsArray): string {
  return literals[0].split('\n').join('');
}
const JOB_PARAMS_ECOM_MARKDOWN = singleLine`(browserTimezone:UTC,layout:(dimensions:(height:354.6000061035156,width:768),id:png),objectType:visualization,relativeUrl:\'
  /app/visualize#/edit/4a36acd0-7ac3-11ea-b69c-cf0d7935cd67?_g=(filters:\u0021\u0021(),refreshInterval:(pause:\u0021\u0021t,value:0),time:(from:now-15m,to:no
  w))&_a=(filters:\u0021\u0021(),linked:\u0021\u0021f,query:(language:kuery,query:\u0021\'\u0021\'),uiState:(),vis:(aggs:\u0021\u0021(),params:(fontSize:12,ma
  rkdown:\u0021\'Ti%E1%BB%83u%20thuy%E1%BA%BFt%20l%C3%A0%20m%E1%BB%99t%20th%E1%BB%83%20lo%E1%BA%A1i%20v%C4%83n%20xu%C3%B4i%20c%C3%B3%20h%C6%B0%20c%E1%BA%A5u,%
  20th%C3%B4ng%20qua%20nh%C3%A2n%20v%E1%BA%ADt,%20ho%C3%A0n%20c%E1%BA%A3nh,%20s%E1%BB%B1%20vi%E1%BB%87c%20%C4%91%E1%BB%83%20ph%E1%BA%A3n%20%C3%A1nh%20b%E1%BB%
  A9c%20tranh%20x%C3%A3%20h%E1%BB%99i%20r%E1%BB%99ng%20l%E1%BB%9Bn%20v%C3%A0%20nh%E1%BB%AFng%20v%E1%BA%A5n%20%C4%91%E1%BB%81%20c%E1%BB%A7a%20cu%E1%BB%99c%20s%
  E1%BB%91ng%20con%20ng%C6%B0%E1%BB%9Di,%20bi%E1%BB%83u%20hi%E1%BB%87n%20t%C3%ADnh%20ch%E1%BA%A5t%20t%C6%B0%E1%BB%9Dng%20thu%E1%BA%ADt,%20t%C3%ADnh%20ch%E1%BA
  %A5t%20k%E1%BB%83%20chuy%E1%BB%87n%20b%E1%BA%B1ng%20ng%C3%B4n%20ng%E1%BB%AF%20v%C4%83n%20xu%C3%B4i%20theo%20nh%E1%BB%AFng%20ch%E1%BB%A7%20%C4%91%E1%BB%81%20
  x%C3%A1c%20%C4%91%E1%BB%8Bnh.%0A%0ATrong%20m%E1%BB%99t%20c%C3%A1ch%20hi%E1%BB%83u%20kh%C3%A1c,%20nh%E1%BA%ADn%20%C4%91%E1%BB%8Bnh%20c%E1%BB%A7a%20Belinski:%
  20%22ti%E1%BB%83u%20thuy%E1%BA%BFt%20l%C3%A0%20s%E1%BB%AD%20thi%20c%E1%BB%A7a%20%C4%91%E1%BB%9Di%20t%C6%B0%22%20ch%E1%BB%89%20ra%20kh%C3%A1i%20qu%C3%A1t%20n
  h%E1%BA%A5t%20v%E1%BB%81%20m%E1%BB%99t%20d%E1%BA%A1ng%20th%E1%BB%A9c%20t%E1%BB%B1%20s%E1%BB%B1,%20trong%20%C4%91%C3%B3%20s%E1%BB%B1%20tr%E1%BA%A7n%20thu%E1%
  BA%ADt%20t%E1%BA%ADp%20trung%20v%C3%A0o%20s%E1%BB%91%20ph%E1%BA%ADn%20c%E1%BB%A7a%20m%E1%BB%99t%20c%C3%A1%20nh%C3%A2n%20trong%20qu%C3%A1%20tr%C3%ACnh%20h%C3
  %ACnh%20th%C3%A0nh%20v%C3%A0%20ph%C3%A1t%20tri%E1%BB%83n%20c%E1%BB%A7a%20n%C3%B3.%20S%E1%BB%B1%20tr%E1%BA%A7n%20thu%E1%BA%ADt%20%E1%BB%9F%20%C4%91%C3%A2y%20
  %C4%91%C6%B0%E1%BB%A3c%20khai%20tri%E1%BB%83n%20trong%20kh%C3%B4ng%20gian%20v%C3%A0%20th%E1%BB%9Di%20gian%20ngh%E1%BB%87%20thu%E1%BA%ADt%20%C4%91%E1%BA%BFn%
  20m%E1%BB%A9c%20%C4%91%E1%BB%A7%20%C4%91%E1%BB%83%20truy%E1%BB%81n%20%C4%91%E1%BA%A1t%20c%C6%A1%20c%E1%BA%A5u%20c%E1%BB%A7a%20nh%C3%A2n%20c%C3%A1ch%5B1%5D.%
  0A%0A%0A%5B1%5D%5E%20M%E1%BB%A5c%20t%E1%BB%AB%20Ti%E1%BB%83u%20thuy%E1%BA%BFt%20trong%20cu%E1%BB%91n%20150%20thu%E1%BA%ADt%20ng%E1%BB%AF%20v%C4%83n%20h%E1%B
  B%8Dc,%20L%E1%BA%A1i%20Nguy%C3%AAn%20%C3%82n%20bi%C3%AAn%20so%E1%BA%A1n,%20Nh%C3%A0%20xu%E1%BA%A5t%20b%E1%BA%A3n%20%C4%90%E1%BA%A1i%20h%E1%BB%8Dc%20Qu%E1%BB
  %91c%20gia%20H%C3%A0%20N%E1%BB%99i,%20in%20l%E1%BA%A7n%20th%E1%BB%A9%202%20c%C3%B3%20s%E1%BB%ADa%20%C4%91%E1%BB%95i%20b%E1%BB%95%20sung.%20H.%202003.%20Tran
  g%20326.\u0021\',openLinksInNewTab:\u0021\u0021f),title:\u0021\'Ti%E1%BB%83u%20thuy%E1%BA%BFt\u0021\',type:markdown))\',title:\'Tiểu thuyết\')`;

// eslint-disable-next-line import/no-default-export
export default ({ getPageObjects, getService }: FtrProviderContext) => {
  const PageObjects = getPageObjects(['common', 'reporting']);
  const log = getService('log');
  const supertest = getService('supertestWithoutAuth');
  const kibanaServer = getService('kibanaServer');
  const testSubjects = getService('testSubjects');
  const esArchiver = getService('esArchiver');
  const reportingApi = getService('reportingAPI');
  const ecommerceSOPath = 'x-pack/test/functional/fixtures/kbn_archiver/reporting/ecommerce.json';

  const postJobJSON = async (
    apiPath: string,
    jobJSON: object = {}
  ): Promise<{ path: string; status: number }> => {
    log.debug(`postJobJSON((${apiPath}): ${JSON.stringify(jobJSON)})`);
    const { body, status } = await supertest.post(apiPath).set('kbn-xsrf', 'xxx').send(jobJSON);
    return { status, path: body.path };
  };

  describe('Polling for jobs', () => {
    beforeEach(async () => {
      await esArchiver.load('x-pack/test/functional/es_archives/empty_kibana');
      await kibanaServer.importExport.load(ecommerceSOPath);
    });

    afterEach(async () => {
      await esArchiver.unload('x-pack/test/functional/es_archives/empty_kibana');
      await kibanaServer.importExport.unload(ecommerceSOPath);
      await reportingApi.deleteAllReports();
    });

    it('Displays new jobs', async () => {
      await PageObjects.common.navigateToApp('reporting');
      await testSubjects.existOrFail('reportJobListing', { timeout: 200000 });

      // post new job
      const { status } = await postJobJSON(`/api/reporting/generate/png`, {
        jobParams: JOB_PARAMS_ECOM_MARKDOWN,
      });
      expect(status).to.be(200);

      await PageObjects.common.sleep(3000); // Wait an amount of time for auto-polling to refresh the jobs

      const [firstTitleElem] = await testSubjects.findAll('reportingListItemObjectTitle');
      const tableCellText = await firstTitleElem.getVisibleText();
      expect(tableCellText).to.be(`Tiểu thuyết`);
    });
  });
};
