/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  buildDiscoverThreatReportNestedIocUrl,
  THREAT_REPORTS_LOOKUP_DATA_VIEW_ID,
} from './build_discover_threat_report_nested_ioc_url';
import { DISCOVER_LOOKUP_TIME_RANGE, THREAT_REPORTS_INDEX_PATTERN } from './constants';
import type { SharePluginStart } from '@kbn/share-plugin/public';

describe('buildDiscoverThreatReportNestedIocUrl', () => {
  it('returns undefined when share or value is missing', () => {
    expect(
      buildDiscoverThreatReportNestedIocUrl({ iocType: 'hash', value: 'abc' })
    ).toBeUndefined();
    const share = {
      url: { locators: { get: () => ({ getRedirectUrl: jest.fn() }) } },
    } as unknown as SharePluginStart;
    expect(
      buildDiscoverThreatReportNestedIocUrl({ share, iocType: 'hash', value: '  ' })
    ).toBeUndefined();
  });

  it('opens classic Discover with a nested extracted.iocs filter on threat reports', () => {
    const getRedirectUrl = jest.fn().mockReturnValue('/app/discover#/?_a=nested');
    const share = {
      url: {
        locators: {
          get: (id: string) => (id === 'DISCOVER_APP_LOCATOR' ? { getRedirectUrl } : undefined),
        },
      },
    } as unknown as SharePluginStart;

    const hash = 'abcdef0123456789abcdef0123456789abcdef0123456789abcdef0123456789';
    expect(buildDiscoverThreatReportNestedIocUrl({ share, iocType: 'hash', value: hash })).toBe(
      '/app/discover#/?_a=nested'
    );

    expect(getRedirectUrl).toHaveBeenCalledWith({
      dataViewSpec: {
        id: THREAT_REPORTS_LOOKUP_DATA_VIEW_ID,
        title: THREAT_REPORTS_INDEX_PATTERN,
        timeFieldName: '@timestamp',
        allowNoIndex: true,
        allowHidden: true,
      },
      timeRange: DISCOVER_LOOKUP_TIME_RANGE,
      query: { language: 'kuery', query: '' },
      filters: [
        {
          meta: {
            index: THREAT_REPORTS_LOOKUP_DATA_VIEW_ID,
            type: 'custom',
            disabled: false,
            negate: false,
            alias: null,
            key: 'extracted.iocs',
            value: `hash:${hash}`,
          },
          query: {
            nested: {
              path: 'extracted.iocs',
              query: {
                bool: {
                  filter: [
                    { term: { 'extracted.iocs.type': 'hash' } },
                    { term: { 'extracted.iocs.value': hash } },
                  ],
                },
              },
            },
          },
        },
      ],
    });
  });
});
