/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { renderHook } from '@testing-library/react';
import { useFindRulesQuery } from '../../../detection_engine/rule_management/api/hooks/use_find_rules_query';
import { useFetchIntegrations } from './use_fetch_integrations';
import { useGetIntegrationFromRuleId } from './use_get_integration_from_rule_id';

jest.mock('../../../detection_engine/rule_management/api/hooks/use_find_rules_query');
jest.mock('./use_fetch_integrations');

describe('useGetIntegrationFromRuleId', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should return undefined integration when no matching rule is found', () => {
    (useFindRulesQuery as jest.Mock).mockReturnValue({ data: { rules: [] }, isLoading: false });
    (useFetchIntegrations as jest.Mock).mockReturnValue({
      installedPackages: [],
      isLoading: false,
    });

    const { result } = renderHook(() => useGetIntegrationFromRuleId({ ruleId: '' }));

    expect(result.current.isLoading).toBe(false);
    expect(result.current.integration).toBe(undefined);
  });

  it('should render loading true is rules are loading', () => {
    (useFindRulesQuery as jest.Mock).mockReturnValue({
      data: undefined,
      isLoading: true,
    });
    (useFetchIntegrations as jest.Mock).mockReturnValue({
      installedPackages: [{ name: 'rule_name' }],
      isLoading: false,
    });

    const { result } = renderHook(() => useGetIntegrationFromRuleId({ ruleId: '' }));

    expect(result.current.isLoading).toBe(true);
    expect(result.current.integration).toBe(undefined);
  });

  it('should render loading true if packages are loading', () => {
    (useFindRulesQuery as jest.Mock).mockReturnValue({
      data: { rules: [] },
      isLoading: false,
    });
    (useFetchIntegrations as jest.Mock).mockReturnValue({
      installedPackages: [],
      isLoading: true,
    });

    const { result } = renderHook(() => useGetIntegrationFromRuleId({ ruleId: '' }));

    expect(result.current.isLoading).toBe(true);
    expect(result.current.integration).toBe(undefined);
  });

  it('should render a matching integration', () => {
    (useFindRulesQuery as jest.Mock).mockReturnValue({
      data: { rules: [{ id: 'rule_id', name: 'rule_name' }] },
      isLoading: false,
    });
    (useFetchIntegrations as jest.Mock).mockReturnValue({
      installedPackages: [{ name: 'rule_name' }],
      isLoading: false,
    });

    const { result } = renderHook(() => useGetIntegrationFromRuleId({ ruleId: 'rule_id' }));

    expect(result.current.isLoading).toBe(false);
    expect(result.current.integration).toEqual({ name: 'rule_name' });
  });
});
