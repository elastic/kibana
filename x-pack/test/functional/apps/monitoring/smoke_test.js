/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import { getLifecycleMethods } from './_get_lifecycle_methods';

export default function ({ getService, getPageObjects }) {
  const overview = getService('monitoringClusterOverview');

  // eslint-disable-next-line mocha/no-exclusive-tests
  describe.only('smoke test', () => {
    const { tearDown } = getLifecycleMethods(getService, getPageObjects);

    before(async () => {
      await overview.closeAlertsModal();
    });

    after(async () => {
      await tearDown();
    });

    it('shows beats panel with data', async () => {
      expect(await overview.getBeatsTotalEventsRate()).to.be('699.9k');
    });
  });
}
