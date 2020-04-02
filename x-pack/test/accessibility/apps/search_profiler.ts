/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

// import expect from '@kbn/expect';
import { FtrProviderContext } from '../ftr_provider_context';

export default function({ getService, getPageObjects }: FtrProviderContext) {
  const PageObjects = getPageObjects(['common', 'security']);
  const a11y = getService('a11y');
  const log = getService('log');
  // const testSubjects = getService('testSubjects');

  describe('Dev tools search profiler', () => {
    before(async () => {
      await PageObjects.common.navigateToApp('searchProfiler');
    });

    it('Dev tools search profiler view', async () => {
      log.debug('hello');
      await a11y.testAppSnapshot();
    });
  });
}
