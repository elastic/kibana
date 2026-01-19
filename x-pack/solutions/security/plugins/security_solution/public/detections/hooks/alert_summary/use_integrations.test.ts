/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { renderHook } from '@testing-library/react';
import { useIntegrations } from './use_integrations';
import { useKibana } from '../../../common/lib/kibana';
import type { PackageListItem } from '@kbn/fleet-plugin/common';
import { installationStatuses } from '@kbn/fleet-plugin/common/constants';
import { RELATED_INTEGRATION } from '../../constants';

jest.mock('../../../common/lib/kibana');

describe('useIntegrations', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should return a checked integration', () => {
    (useKibana as jest.Mock).mockReturnValue({
      services: {
        data: {
          query: {
            filterManager: {
              getFilters: jest.fn().mockReturnValue([]),
            },
          },
        },
      },
    });

    const packages: PackageListItem[] = [
      {
        id: 'splunk',
        name: 'splunk',
        status: installationStatuses.Installed,
        title: 'Splunk',
        version: '',
      },
    ];

    const { result } = renderHook(() => useIntegrations({ packages }));

    expect(result.current).toEqual({
      integrations: [
        {
          checked: 'on',
          'data-test-subj': 'alert-summary-integration-option-Splunk',
          key: 'splunk',
          label: 'Splunk',
        },
      ],
    });
  });

  it('should return an un-checked integration', () => {
    (useKibana as jest.Mock).mockReturnValue({
      services: {
        data: {
          query: {
            filterManager: {
              getFilters: jest.fn().mockReturnValue([
                {
                  meta: {
                    alias: null,
                    negate: true,
                    disabled: false,
                    type: 'phrase',
                    key: RELATED_INTEGRATION,
                    params: { query: 'splunk' },
                  },
                  query: { match_phrase: { [RELATED_INTEGRATION]: 'splunk' } },
                },
              ]),
            },
          },
        },
      },
    });

    const packages: PackageListItem[] = [
      {
        id: 'splunk',
        name: 'splunk',
        status: installationStatuses.Installed,
        title: 'Splunk',
        version: '',
      },
    ];

    const { result } = renderHook(() => useIntegrations({ packages }));

    expect(result.current).toEqual({
      integrations: [
        {
          'data-test-subj': 'alert-summary-integration-option-Splunk',
          key: 'splunk',
          label: 'Splunk',
        },
      ],
    });
  });
});
