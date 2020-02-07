/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */


import expect from '@kbn/expect';
import { FtrProviderContext } from '../../../ftr_provider_context';
// import { TestSubjectsProvider } from 'test/functional/services/test_subjects';

export default function({ getPageObjects, getService }: FtrProviderContext) {
  // const kibanaServer = getService('kibanaServer');
  // const PageObjects = getPageObjects(['common', 'settings', 'security', 'spaceSelector']);
  const PageObjects = getPageObjects(['common']);
  // const appsMenu = getService('appsMenu');
  const testSubjects = getService('testSubjects');
  // const globalNav = getService('globalNav');
  const find = getService('find');
  const browser = getService('browser');
  const config = getService('config');
  const log = getService('log');
  // const defaultTryTimeout = config.get('timeouts.try');
  const defaultFindTimeout = config.get('timeouts.find');


  describe('internationalization', () => {
    let lang;

    before(async () => {
      const konfig = config.get('servers.kibana');
      log.debug(JSON.stringify(konfig));
      await browser.get(konfig.protocol + '://' + konfig.hostname + ':' + konfig.port);
      await PageObjects.common.sleep(5000);
    });

    it('login page is translated', async () => {
      let titleElement = await find.byCssSelector('.loginWelcome__title');
      let titleText = await titleElement.getVisibleText();
      // expect(titleText).to.eql('欢迎使用 Kibana');

      // titleElement = await find.byCssSelector('.loginWelcome__subtitle');
      // titleText = await titleElement.getVisibleText();
      // expect(titleText).to.eql('您了解 Elastic Stack 的窗口');

      // // the "all" here are the labels on the Username and Password field
      // titleElement = await find.allByCssSelector('div.euiFormRow__labelWrapper > label');
      // titleText = await titleElement[0].getVisibleText();
      // expect(titleText).to.eql('用户名');

      // titleText = await titleElement[1].getVisibleText();
      // expect(titleText).to.eql('密码');

      // titleText = await testSubjects.getVisibleText('loginSubmit');
      // expect(titleText).to.eql('登录');

      const html = await find.byCssSelector('html');
      lang = await html.getAttribute('lang');
      log.debug(`---------- lang = ${lang}`);
      const body = await find.byCssSelector('body');
      const bodyText = await body.getVisibleText();
      log.debug(`body = ${bodyText}`);
      switch (lang) {
        case 'zh-cn':
          expect(bodyText).to.eql(
            '欢迎使用 Kibana\n您了解 Elastic Stack 的窗口\n用户名\n密码\n登录'
          );
          break;
        case 'en-us': 
          expect(bodyText).to.eql('Kibana\nElastic Stack\nUsername\nPassword\nSubmit');
        break;
      }
    });

    // it('login failure is translated', async () => {
    //   await testSubjects.setValue('loginUsername','anyusername');
    //   await testSubjects.setValue('loginPassword','anypassword');
    //   await testSubjects.click('loginSubmit');
    //   const titleText = await testSubjects.getVisibleText('loginErrorMessage')
      // switch (lang) {
      //   case 'zh-cn':
      //     expect(titleText).to.eql('用户名或密码无效。请重试。');
      //     break;
      // }
    // });

    it('login success', async () => {
      await testSubjects.setValue('loginUsername','elastic');
      await testSubjects.setValue('loginPassword','changeme');
      await testSubjects.click('loginSubmit');
      await PageObjects.common.sleep(5000);
      await find.byCssSelector(
        '[data-test-subj="kibanaChrome"] nav:not(.ng-hide)',
        2 * defaultFindTimeout
      );
    });
  });
}
