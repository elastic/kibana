/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { getMockTheme } from '../../../common/lib/kibana/kibana_react.mock';

export const mockTheme = getMockTheme({
  eui: {
    euiSizeL: '10px',
    euiBreakpoints: { s: '10px' },
    euiSizeS: '10px',
    euiSizeM: '10px',
  },
});

export const mockTiDataSources = {
  totalCount: 5,
  tiDataSources: [
    { dataset: 'ti_abusech', name: 'AbuseCH', count: 5, path: '/dashboard_path_abuseurl' },
  ],
};

export const mockCtiLinksResponse = {
  listItems: [
    { title: 'abuseurl', count: 1, path: '/dashboard_path_abuseurl' },
    { title: 'abusemalware', count: 2, path: '/dashboard_path_abusemalware' },
    { title: 'alienvaultotx', count: 7, path: '/dashboard_path_alienvaultotx' },
    { title: 'anomali', count: 0, path: '/dashboard_path_anomali' },
    { title: 'anomalithreatstream', count: 0, path: '/dashboard_path_anomalithreatstream' },
    { title: 'malwarebazaar', count: 4, path: '/dashboard_path_malwarebazaar' },
    { title: 'misp', count: 6, path: '/dashboard_path_misp' },
  ],
};

export const mockProps = {
  to: '2020-01-20T20:49:57.080Z',
  from: '2020-01-21T20:49:57.080Z',
  setQuery: jest.fn(),
  deleteQuery: jest.fn(),
  allIntegrationsInstalled: true,
  allTiDataSources: [
    { dataset: 'ti_abusech', name: 'AbuseCH', count: 5, path: '/dashboard_path_abuseurl' },
  ],
};
