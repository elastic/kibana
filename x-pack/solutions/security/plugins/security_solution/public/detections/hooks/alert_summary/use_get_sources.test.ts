/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { renderHook } from '@testing-library/react';
import { useSources } from './use_get_sources';
import { useKibana } from '../../../common/lib/kibana';
import type { PackageListItem } from '@kbn/fleet-plugin/common';
import { installationStatuses } from '@kbn/fleet-plugin/common/constants';
import type { RulesQueryResponse } from '../../../detection_engine/rule_management/api/hooks/use_find_rules_query';
import { FILTER_KEY } from '../../components/alert_summary/search_bar/sources_filter_button';

jest.mock('../../../common/lib/kibana');

describe('useSources', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should return a checked source', () => {
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
          name: 'SplunkRuleName',
        },
      ],
      total: 0,
    } as unknown as RulesQueryResponse;

    const { result } = renderHook(() => useSources({ packages, ruleResponse }));

    expect(result.current).toEqual([
      {
        checked: 'on',
        'data-test-subj': 'alert-summary-source-option-Splunk',
        key: 'SplunkRuleName',
        label: 'Splunk',
      },
    ]);
  });

  it('should return an un-checked source', () => {
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
                    params: { query: 'Splunk' },
                  },
                  query: { match_phrase: { [FILTER_KEY]: 'Splunk' } },
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
          name: 'SplunkRuleName',
        },
      ],
      total: 0,
    } as unknown as RulesQueryResponse;

    const { result } = renderHook(() => useSources({ packages, ruleResponse }));

    expect(result.current).toEqual([
      {
        'data-test-subj': 'alert-summary-source-option-Splunk',
        key: 'SplunkRuleName',
        label: 'Splunk',
      },
    ]);
  });

  it('should not return a source if no rule match', () => {
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
    const ruleResponse = undefined;

    const { result } = renderHook(() => useSources({ packages, ruleResponse }));

    expect(result.current).toHaveLength(0);
  });
});
