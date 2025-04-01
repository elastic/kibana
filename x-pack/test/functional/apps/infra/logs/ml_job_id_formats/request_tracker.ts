/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Browser } from '@kbn/ftr-common-functional-ui-services';
import { CommonPageObject } from '@kbn/test-suites-src/functional/page_objects/common_page';

type PerformanceResourceTimingWithHttpStatus = PerformanceResourceTiming & {
  responseStatus: number;
};

export interface RequestLogEntry {
  url: string;
  timestamp: number;
  status: number;
}

declare global {
  interface Window {
    ftrLogsUiAnomalies?: {
      requests: RequestLogEntry[];
      observer: PerformanceObserver;
    };
  }
}

export function createRequestTracker(browser: Browser, common: CommonPageObject) {
  async function install() {
    await browser.execute(() => {
      function handleTimings(entryList: PerformanceObserverEntryList) {
        const entries = entryList.getEntriesByType(
          'resource'
        ) as PerformanceResourceTimingWithHttpStatus[];

        entries
          .filter((entry) => entry.initiatorType === 'fetch')
          .forEach((entry) => {
            if (window.ftrLogsUiAnomalies) {
              window.ftrLogsUiAnomalies.requests.push({
                url: entry.name,
                timestamp: entry.startTime,
                status: entry.responseStatus,
              });
            } else {
              throw new Error('Request tracker not installed');
            }
          });
      }

      const observer = new PerformanceObserver(handleTimings);
      observer.observe({ type: 'resource', buffered: true });

      window.ftrLogsUiAnomalies = {
        observer,
        requests: [],
      };
    });
  }

  async function getRequests(pattern: RegExp, timeToWait: number = 0) {
    if (timeToWait > 0) {
      await common.sleep(timeToWait);
    }

    // Passing RegExp to the browser doesn't seem to serialize well
    // so we pass a string, but .toString returns it like /pattern/ which
    // when we compile it in the browser gets escaped to /\/pattern\//
    // thus we remove the surrounding slashes
    const patternString = pattern.toString();
    const trimmedPattern = patternString.substring(1, patternString.length - 1);

    return await browser.execute((browserPattern: string) => {
      const regExp = new RegExp(browserPattern);
      if (window.ftrLogsUiAnomalies) {
        const entries = window.ftrLogsUiAnomalies.requests.filter((entry) =>
          regExp.test(entry.url)
        );
        entries.sort((a, b) => a.timestamp - b.timestamp);
        return entries;
      } else {
        throw new Error('Request tracker not installed');
      }
    }, trimmedPattern);
  }

  async function uninstall() {
    await browser.execute(() => {
      if (window.ftrLogsUiAnomalies) {
        window.ftrLogsUiAnomalies.observer.disconnect();
        delete window.ftrLogsUiAnomalies;
      } else {
        throw new Error('Request tracker not installed');
      }
    });
  }

  return { install, getRequests, uninstall };
}
