/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { renderHook } from '@testing-library/react';
import { FlowTargetSourceDest } from '../../common/search_strategy/security_solution/network';
import { useAttackFlyoutApi } from './attack/use_attack_flyout_api';
import { createAttackFlyoutApiMock } from './attack/use_attack_flyout_api.mock';
import { useNetworkFlyoutApi } from './network/use_network_flyout_api';
import { createNetworkFlyoutApiMock } from './network/use_network_flyout_api.mock';
import { useRuleFlyoutApi } from './rule/use_rule_flyout_api';
import { createRuleFlyoutApiMock } from './rule/use_rule_flyout_api.mock';
import { useFlyoutApi } from './use_flyout_api';

jest.mock('./attack/use_attack_flyout_api');
jest.mock('./network/use_network_flyout_api');
jest.mock('./rule/use_rule_flyout_api');

describe('useFlyoutApi', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('exposes the attack, network, and rule flyout methods from composed per-type hooks', () => {
    const attackApi = createAttackFlyoutApiMock();
    const networkApi = createNetworkFlyoutApiMock();
    const ruleApi = createRuleFlyoutApiMock();
    jest.mocked(useAttackFlyoutApi).mockReturnValue(attackApi);
    jest.mocked(useNetworkFlyoutApi).mockReturnValue(networkApi);
    jest.mocked(useRuleFlyoutApi).mockReturnValue(ruleApi);

    const { result } = renderHook(() => useFlyoutApi());

    const attackParams = { attackId: 'attack-1', indexName: '.alerts-security' };
    const networkParams = { ip: '1.2.3.4', flowTarget: FlowTargetSourceDest.source };
    const ruleParams = { ruleId: 'rule-1' };

    // The facade surfaces the composed methods, and calling one delegates to the per-type hook.
    result.current.openAttackFlyout(attackParams);
    result.current.openAttackFlyoutAsChild(attackParams);
    result.current.openNetworkFlyout(networkParams);
    result.current.openNetworkFlyoutAsChild(networkParams);
    result.current.openRuleFlyout(ruleParams);
    result.current.openRuleFlyoutAsChild(ruleParams);

    expect(attackApi.openAttackFlyout).toHaveBeenCalledWith(attackParams);
    expect(attackApi.openAttackFlyoutAsChild).toHaveBeenCalledWith(attackParams);
    expect(networkApi.openNetworkFlyout).toHaveBeenCalledWith(networkParams);
    expect(networkApi.openNetworkFlyoutAsChild).toHaveBeenCalledWith(networkParams);
    expect(ruleApi.openRuleFlyout).toHaveBeenCalledWith(ruleParams);
    expect(ruleApi.openRuleFlyoutAsChild).toHaveBeenCalledWith(ruleParams);
  });
});
