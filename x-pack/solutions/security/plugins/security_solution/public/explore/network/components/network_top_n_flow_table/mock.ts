/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type {
  NetworkTopNFlowCountStrategyResponse,
  NetworkTopNFlowStrategyResponse,
} from '../../../../../common/search_strategy';
import { FlowTargetSourceDest } from '../../../../../common/search_strategy';

export const mockCount: NetworkTopNFlowCountStrategyResponse = {
  totalCount: 524,
  rawResponse: {} as NetworkTopNFlowStrategyResponse['rawResponse'],
};

export const mockData: NetworkTopNFlowStrategyResponse = {
  edges: [
    {
      node: {
        source: {
          autonomous_system: {
            name: 'Google, Inc',
            number: 15169,
          },
          domain: ['test.domain.com'],
          flows: 12345,
          destination_ips: 12,
          ip: '8.8.8.8',
          location: {
            geo: {
              continent_name: ['North America'],
              country_iso_code: ['US'],
              city_name: ['Mountain View'],
              region_iso_code: ['US-CA'],
              region_name: ['California'],
            },
            flowTarget: FlowTargetSourceDest.source,
          },
        },
        network: {
          bytes_in: 3826633497,
          bytes_out: 1083495734,
        },
      },
      cursor: {
        value: '8.8.8.8',
      },
    },
    {
      node: {
        source: {
          autonomous_system: {
            name: 'TM Net, Internet Service Provider',
            number: 4788,
          },
          domain: ['test.domain.net', 'test.old.domain.net'],
          flows: 12345,
          destination_ips: 12,
          ip: '9.9.9.9',
          location: {
            geo: {
              continent_name: ['Asia'],
              country_iso_code: ['MY'],
              city_name: ['Petaling Jaya'],
              region_iso_code: ['MY-10'],
              region_name: ['Selangor'],
            },
            flowTarget: FlowTargetSourceDest.source,
          },
        },
        network: {
          bytes_in: 3826633497,
          bytes_out: 1083495734,
        },
      },
      cursor: {
        value: '9.9.9.9',
      },
    },
  ],
  rawResponse: {} as NetworkTopNFlowStrategyResponse['rawResponse'],
};
