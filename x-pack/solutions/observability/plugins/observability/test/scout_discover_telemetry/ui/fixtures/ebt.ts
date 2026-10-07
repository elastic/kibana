/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ScoutPage } from '@kbn/scout-oblt';

export interface DiscoverEbtEvent {
  context: { discoverProfiles?: string[] };
  properties: Record<string, unknown>;
}

// Inlined in `page.evaluate`: the callback runs in the browser, so it cannot
// close over a Node helper.
export async function setEbtOptIn(page: ScoutPage, optIn: boolean) {
  await page.evaluate((enabled) => {
    (
      window as unknown as {
        __analytics_ftr_helpers__: { setOptIn: (value: boolean) => void };
      }
    ).__analytics_ftr_helpers__.setOptIn(enabled);
  }, optIn);
}

export async function getEbtEvents(page: ScoutPage, eventTypes: string[], withTimeoutMs = 500) {
  return page.evaluate(
    async ({ eventTypes: types, withTimeoutMs: timeout }) => {
      const analytics = (
        window as unknown as {
          __analytics_ftr_helpers__: {
            setOptIn: (value: boolean) => void;
            getEvents: (
              takeNumberOfEvents: number,
              options: { eventTypes: string[]; withTimeoutMs: number }
            ) => Promise<
              Array<{
                context: { discoverProfiles?: string[] };
                properties: Record<string, unknown>;
              }>
            >;
          };
        }
      ).__analytics_ftr_helpers__;
      analytics.setOptIn(true);
      return analytics.getEvents(Number.MAX_SAFE_INTEGER, {
        eventTypes: types,
        withTimeoutMs: timeout,
      });
    },
    { eventTypes, withTimeoutMs }
  );
}
