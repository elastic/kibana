/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import type { FtrProviderContext } from '../ftr_provider_context';

/**
 * Strings Needs to be hardcoded since getting it from the i18n.translate
 * function will not actually test if the expected locale is being used.
 *
 * The alternative would be to read directly from the filesystem but this
 * would add unnecessary ties between the test suite and the localization plugin.
 */
function getExpectedI18nTranslation(locale: string): string | undefined {
  switch (locale) {
    case 'ja-JP':
      return 'Elasticへようこそ';
    case 'zh-CN':
      return '欢迎使用 Elastic';
    case 'fr-FR':
      return 'Bienvenue dans Elastic';
    default:
      return;
  }
}

function getI18nLocaleFromServerArgs(kbnServerArgs: string[]): string {
  const re = /--i18n\.locale=(?<locale>.*)/;
  for (const serverArg of kbnServerArgs) {
    const match = re.exec(serverArg);
    const locale = match?.groups?.locale;
    if (locale) {
      return locale;
    }
  }

  throw Error('i18n.locale is not set in the server arguments');
}

export default function ({ getService, getPageObjects }: FtrProviderContext) {
  const testSubjects = getService('testSubjects');
  const config = getService('config');
  const log = getService('log');
  const retry = getService('retry');
  const PageObjects = getPageObjects(['common', 'security']);

  describe('Login Page', function () {
    this.tags('includeFirefox');

    before(async () => {
      await PageObjects.security.forceLogout();
    });

    afterEach(async () => {
      // NOTE: Logout needs to happen before anything else to avoid flaky behavior
      await PageObjects.security.forceLogout();
    });

    // disabled until new translations are in place
    // https://github.com/elastic/kibana/issues/149255
    xit('login page meets i18n requirements', async () => {
      await PageObjects.common.navigateToApp('login');
      const serverArgs: string[] = config.get('kbnTestServer.serverArgs');
      const kbnServerLocale = getI18nLocaleFromServerArgs(serverArgs);

      log.debug(`Expecting page to be using ${kbnServerLocale} Locale.`);

      const expectedWelcomeTitleText = getExpectedI18nTranslation(kbnServerLocale);
      await retry.waitFor(
        'login page visible',
        async () => await testSubjects.exists('loginSubmit')
      );
      const welcomeTitleText = await testSubjects.getVisibleText('loginWelcomeTitle');

      expect(welcomeTitleText).not.to.be(undefined);
      expect(welcomeTitleText).to.be(expectedWelcomeTitleText);
    });
  });
}
