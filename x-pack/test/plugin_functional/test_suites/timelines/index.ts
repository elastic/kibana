/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { FtrProviderContext } from '../../ftr_provider_context';

export default function ({ getPageObjects, getService }: FtrProviderContext) {
  describe('Timelines plugin API', function () {
    this.tags('ciGroup7');
    const pageObjects = getPageObjects(['common']);
    const testSubjects = getService('testSubjects');

    describe('timelines plugin rendering', function () {
      before(async () => {
        await pageObjects.common.navigateToApp('timelineTest');
      });
      it('shows the timeline component on navigation', async () => {
        await testSubjects.existOrFail('events-viewer-panel');
      });
    });
  });
}
