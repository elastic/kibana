/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import Fs from 'fs';
import Yaml from 'js-yaml';
import expect from '@kbn/expect';
import { FtrProviderContext } from '../ftr_provider_context';

const PATH = '../x-pack/test/accessibility/a11y_errors_count.yml';

interface Errors {
  [key: string]: number;
}

function readErrors() {
  let yaml;
  try {
    yaml = Fs.readFileSync(PATH, 'utf8');
  } catch (error) {
    if (error.code !== 'ENOENT') {
      throw error;
    }
  }

  return yaml ? Yaml.safeLoad(yaml) : {};
}

function updateErrors(originalErrors: Errors, currentErrors: Errors) {
  const updatedErrors: Errors = {};

  for (const [key, value] of Object.entries(currentErrors)) {
    const originalCount = originalErrors[key];

    if (originalCount && originalCount < value) {
      updatedErrors[key] = originalCount;
    } else {
      updatedErrors[key] = value;
    }
  }

  Fs.writeFileSync(PATH, Yaml.safeDump({ errorsPerPage: updatedErrors }));
}

export default function ({ getService, getPageObjects }: FtrProviderContext) {
  const { common, header } = getPageObjects(['common', 'header']);
  const a11y = getService('a11y');
  const config = getService('config');
  const log = getService('log');

  let originalErrors = {};
  const currentErrors: Errors = {};

  describe('Automated pass', () => {
    before(async () => {
      await common.navigateToActualUrl('home');
      originalErrors = readErrors();
    });
    after(() => {
      updateErrors(originalErrors, currentErrors);
    });

    it('runs', async () => {
      const apps: Array<[string, { pathname: string; hash?: string }]> = Array.from(
        Object.entries(config.get('apps'))
      );

      for (const [app, { hash }] of apps) {
        if (app === 'login') continue; // causes a perpetual login loop, ignore
        await common.navigateToActualUrl(app, hash);
        await header.waitUntilLoadingHasFinished();
        const errorCount =
          (await a11y.testAppSnapshot({
            returnErrorCount: true,
            reportType: 'all',
          })) ?? 0;
        if (errorCount > (currentErrors[app] ?? 0)) {
          // If you've found your way here and aren't sure why, you've introduced a new a11y failure
          // Run axe on your page to get more accurate reporting of where and what the problem is
          // You can run axe either through a browser addon or by writing a dedicated a11y test
          new Error(`App: ${app}; Errors: ${errorCount}; Max allowed: ${currentErrors[app] ?? 0}`);
        } else {
          currentErrors[app] = errorCount;
        }
      }
    });
  });
}
