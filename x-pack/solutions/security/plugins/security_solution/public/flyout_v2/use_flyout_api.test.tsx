/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { renderHook } from '@testing-library/react';
import type { DataTableRecord } from '@kbn/discover-utils';
import { FlowTargetSourceDest } from '../../common/search_strategy/security_solution/network';
import type { Indicator } from '../../common/threat_intelligence/types/indicator';
import { useAttackFlyoutApi } from './attack/use_attack_flyout_api';
import { createAttackFlyoutApiMock } from './attack/use_attack_flyout_api.mock';
import { useDocumentFlyoutApi } from './document/use_document_flyout_api';
import { createDocumentFlyoutApiMock } from './document/use_document_flyout_api.mock';
import { useIocFlyoutApi } from './ioc/use_ioc_flyout_api';
import { createIocFlyoutApiMock } from './ioc/use_ioc_flyout_api.mock';
import { useNetworkFlyoutApi } from './network/use_network_flyout_api';
import { createNetworkFlyoutApiMock } from './network/use_network_flyout_api.mock';
import { useRuleFlyoutApi } from './rule/use_rule_flyout_api';
import { createRuleFlyoutApiMock } from './rule/use_rule_flyout_api.mock';
import { useFlyoutApi } from './use_flyout_api';

jest.mock('./attack/use_attack_flyout_api');
jest.mock('./document/use_document_flyout_api');
jest.mock('./ioc/use_ioc_flyout_api');
jest.mock('./network/use_network_flyout_api');
jest.mock('./rule/use_rule_flyout_api');

describe('useFlyoutApi', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('exposes document, attack, IOC, network, and rule methods from composed hooks', () => {
    const documentApi = createDocumentFlyoutApiMock();
    const attackApi = createAttackFlyoutApiMock();
    const iocApi = createIocFlyoutApiMock();
    const networkApi = createNetworkFlyoutApiMock();
    const ruleApi = createRuleFlyoutApiMock();
    jest.mocked(useDocumentFlyoutApi).mockReturnValue(documentApi);
    jest.mocked(useAttackFlyoutApi).mockReturnValue(attackApi);
    jest.mocked(useIocFlyoutApi).mockReturnValue(iocApi);
    jest.mocked(useNetworkFlyoutApi).mockReturnValue(networkApi);
    jest.mocked(useRuleFlyoutApi).mockReturnValue(ruleApi);

    const { result } = renderHook(() => useFlyoutApi());

    const fromIndexParams = { documentId: '1', indexName: 'index' };
    const attackParams = { attackId: 'attack-1', indexName: '.alerts-security' };
    const iocParams = { indicator: { _id: 'ioc-1', fields: {} } as unknown as Indicator };
    const networkParams = { ip: '1.2.3.4', flowTarget: FlowTargetSourceDest.source };
    const ruleParams = { ruleId: 'rule-1' };
    const hit = { id: '1', raw: { _id: '1' }, flattened: {} } as unknown as DataTableRecord;

    result.current.openDocumentFlyoutFromIndex(fromIndexParams);
    result.current.openDocumentFlyoutFromIndexAsChild(fromIndexParams);
    result.current.openNotes({ hit });
    result.current.openAttackFlyout(attackParams);
    result.current.openAttackFlyoutAsChild(attackParams);
    result.current.openIocFlyout(iocParams);
    result.current.openIocFlyoutAsChild(iocParams);
    result.current.openNetworkFlyout(networkParams);
    result.current.openNetworkFlyoutAsChild(networkParams);
    result.current.openRuleFlyout(ruleParams);
    result.current.openRuleFlyoutAsChild(ruleParams);

    expect(documentApi.openDocumentFlyoutFromIndex).toHaveBeenCalledWith(fromIndexParams);
    expect(documentApi.openDocumentFlyoutFromIndexAsChild).toHaveBeenCalledWith(fromIndexParams);
    expect(documentApi.openNotes).toHaveBeenCalledWith({ hit });
    expect(attackApi.openAttackFlyout).toHaveBeenCalledWith(attackParams);
    expect(attackApi.openAttackFlyoutAsChild).toHaveBeenCalledWith(attackParams);
    expect(iocApi.openIocFlyout).toHaveBeenCalledWith(iocParams);
    expect(iocApi.openIocFlyoutAsChild).toHaveBeenCalledWith(iocParams);
    expect(networkApi.openNetworkFlyout).toHaveBeenCalledWith(networkParams);
    expect(networkApi.openNetworkFlyoutAsChild).toHaveBeenCalledWith(networkParams);
    expect(ruleApi.openRuleFlyout).toHaveBeenCalledWith(ruleParams);
    expect(ruleApi.openRuleFlyoutAsChild).toHaveBeenCalledWith(ruleParams);
  });
});
