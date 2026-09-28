/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import type { FtrProviderContext } from '../../ftr_provider_context';

export function UptimeMonitorProvider({ getService }: FtrProviderContext) {
  const testSubjects = getService('testSubjects');
  const retry = getService('retry');

  return {
    async displayOverallAvailability(availabilityVal: string) {
      return retry.tryForTime(60 * 1000, async () => {
        await testSubjects.existOrFail('uptimeOverallAvailability');
        const availability = await testSubjects.getVisibleText('uptimeOverallAvailability');
        expect(availability).to.be(availabilityVal);
      });
    },
  };
}
