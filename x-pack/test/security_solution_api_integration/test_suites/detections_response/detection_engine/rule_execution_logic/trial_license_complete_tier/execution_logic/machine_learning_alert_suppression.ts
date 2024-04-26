/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { FtrProviderContext } from '../../../../../../ftr_provider_context';

export default ({ getService }: FtrProviderContext) => {
  // TODO: tags
  describe('Machine Learning Detection Rule - Alert Suppression', () => {
    describe('with anomalies available to be alerted upon', () => {
      describe('with per-execution suppression duration', () => {
        it.skip('performs no suppression if a single alert is generated');
        it.skip('suppresses alerts within a single execution');
        it.skip('suppresses alerts in multiple executions');
        it.skip('suppresses alerts with timestamp override configured');
        it.skip(
          'deduplicates previously suppressed alerts if rule has overlapping execution windows'
        );
      });

      describe('with interval suppression duration', () => {
        it.skip('performs no suppression if a single alert is generated');
        it.skip('suppresses alerts across two executions');
        it.skip('suppresses alerts across three executions');
        it.skip('suppresses alerts across multiple, sparse executions');
        it.skip('suppresses alerts on multiple fields');
        it.skip('suppresses only alerts that match suppression conditions');
        it.skip('does not suppress into a closed alert');
        it.skip('does not suppress into an unsuppressed alert');
        it.skip('does not suppress when the suppression interval is less than the rule interval');
        it.skip('suppresses alerts within a single execution');
        it.skip('suppresses alerts with timestamp override configured');
        it.skip(
          'deduplicates previously suppressed alerts if rule has overlapping execution windows'
        );
        it.skip('applies exceptions before suppression');
        it.skip('does not suppress alerts with missing fields, if not configured to do so');
        it.skip('suppresses alerts with missing fields, if configured to do so');
        it.skip('suppresses alerts with array field values');
      });
    });
  });
};
