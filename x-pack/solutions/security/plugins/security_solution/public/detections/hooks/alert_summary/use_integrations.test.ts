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
import { FILTER_KEY } from '../../components/alert_summary/search_bar/integrations_filter_button';
import type { RuleResponse } from '../../../../common/api/detection_engine';

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
    const ruleResponse = {
      rules: [
        {
          related_integrations: [{ package: 'splunk' }],
          id: 'SplunkRuleId',
        } as RuleResponse,
      ],
      isLoading: false,
    };

    const { result } = renderHook(() => useIntegrations({ packages, ruleResponse }));

    expect(result.current).toEqual({
      isLoading: false,
      integrations: [
        {
          checked: 'on',
          'data-test-subj': 'alert-summary-integration-option-Splunk',
          key: 'SplunkRuleId',
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
                    key: FILTER_KEY,
                    params: { query: 'SplunkRuleId' },
                  },
                  query: { match_phrase: { [FILTER_KEY]: 'SplunkRuleId' } },
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
    const ruleResponse = {
      rules: [
        {
          related_integrations: [{ package: 'splunk' }],
          id: 'SplunkRuleId',
        } as RuleResponse,
      ],
      isLoading: false,
    };

    const { result } = renderHook(() => useIntegrations({ packages, ruleResponse }));

    expect(result.current).toEqual({
      isLoading: false,
      integrations: [
        {
          'data-test-subj': 'alert-summary-integration-option-Splunk',
          key: 'SplunkRuleId',
          label: 'Splunk',
        },
      ],
    });
  });

  it('should not return a integration if no rule match', () => {
    (useKibana as jest.Mock).mockReturnValue({
      services: {
        data: { query: { filterManager: { getFilters: jest.fn().mockReturnValue([]) } } },
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
    const ruleResponse = {
      rules: [],
      isLoading: false,
    };

    const { result } = renderHook(() => useIntegrations({ packages, ruleResponse }));

    expect(result.current).toEqual({
      isLoading: false,
      integrations: [],
    });
  });

  it('should return isLoading true if rules are loading', () => {
    (useKibana as jest.Mock).mockReturnValue({
      services: {
        data: { query: { filterManager: { getFilters: jest.fn().mockReturnValue([]) } } },
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
    const ruleResponse = {
      rules: [],
      isLoading: true,
    };

    const { result } = renderHook(() => useIntegrations({ packages, ruleResponse }));

    expect(result.current).toEqual({
      isLoading: true,
      integrations: [],
    });
  });
});
