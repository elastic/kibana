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
import { useCspFlyoutApi } from './csp/use_csp_flyout_api';
import { createCspFlyoutApiMock } from './csp/use_csp_flyout_api.mock';
import { useDocumentFlyoutApi } from './document/use_document_flyout_api';
import { createDocumentFlyoutApiMock } from './document/use_document_flyout_api.mock';
import { useEntityFlyoutApi } from './entity/use_entity_flyout_api';
import { createEntityFlyoutApiMock } from './entity/use_entity_flyout_api.mock';
import { useIocFlyoutApi } from './ioc/use_ioc_flyout_api';
import { createIocFlyoutApiMock } from './ioc/use_ioc_flyout_api.mock';
import { useNetworkFlyoutApi } from './network/use_network_flyout_api';
import { createNetworkFlyoutApiMock } from './network/use_network_flyout_api.mock';
import { useRuleFlyoutApi } from './rule/use_rule_flyout_api';
import { createRuleFlyoutApiMock } from './rule/use_rule_flyout_api.mock';
import { useSharedToolsFlyoutApi } from './shared/tools/use_shared_tools_flyout_api';
import { createSharedToolsFlyoutApiMock } from './shared/tools/use_shared_tools_flyout_api.mock';
import { useFlyoutApi } from './use_flyout_api';

jest.mock('./attack/use_attack_flyout_api');
jest.mock('./csp/use_csp_flyout_api');
jest.mock('./document/use_document_flyout_api');
jest.mock('./entity/use_entity_flyout_api');
jest.mock('./ioc/use_ioc_flyout_api');
jest.mock('./network/use_network_flyout_api');
jest.mock('./rule/use_rule_flyout_api');
jest.mock('./shared/tools/use_shared_tools_flyout_api');

describe('useFlyoutApi', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('exposes document, attack, CSP, entity, IOC, network, rule and shared-tools methods from composed hooks', () => {
    const documentApi = createDocumentFlyoutApiMock();
    const attackApi = createAttackFlyoutApiMock();
    const cspApi = createCspFlyoutApiMock();
    const entityApi = createEntityFlyoutApiMock();
    const iocApi = createIocFlyoutApiMock();
    const networkApi = createNetworkFlyoutApiMock();
    const ruleApi = createRuleFlyoutApiMock();
    const sharedToolsApi = createSharedToolsFlyoutApiMock();
    jest.mocked(useDocumentFlyoutApi).mockReturnValue(documentApi);
    jest.mocked(useAttackFlyoutApi).mockReturnValue(attackApi);
    jest.mocked(useCspFlyoutApi).mockReturnValue(cspApi);
    jest.mocked(useEntityFlyoutApi).mockReturnValue(entityApi);
    jest.mocked(useIocFlyoutApi).mockReturnValue(iocApi);
    jest.mocked(useNetworkFlyoutApi).mockReturnValue(networkApi);
    jest.mocked(useRuleFlyoutApi).mockReturnValue(ruleApi);
    jest.mocked(useSharedToolsFlyoutApi).mockReturnValue(sharedToolsApi);

    const { result } = renderHook(() => useFlyoutApi());

    const fromIndexParams = { documentId: '1', indexName: 'index' };
    const attackParams = { attackId: 'attack-1', indexName: '.alerts-security' };
    const misconfigurationParams = { resourceId: 'resource-1', ruleId: 'rule-1' };
    const vulnerabilityParams = { vulnerabilityId: 'CVE-1', resourceId: 'resource-1' };
    const hostParams = { hostName: 'host-1' };
    const userParams = { userName: 'user-1' };
    const iocParams = { indicator: { _id: 'ioc-1', fields: {} } as unknown as Indicator };
    const networkParams = { ip: '1.2.3.4', flowTarget: FlowTargetSourceDest.source };
    const ruleParams = { ruleId: 'rule-1' };
    const hit = { id: '1', raw: { _id: '1' }, flattened: {} } as unknown as DataTableRecord;

    result.current.openDocumentFlyoutFromIndex(fromIndexParams);
    result.current.openDocumentFlyoutFromIndexAsChild(fromIndexParams);
    result.current.openNotes({ hit });
    result.current.openAttackFlyout(attackParams);
    result.current.openAttackFlyoutAsChild(attackParams);
    result.current.openMisconfigurationFinding(misconfigurationParams);
    result.current.openMisconfigurationFindingAsChild(misconfigurationParams, { title: 'my-host' });
    result.current.openVulnerabilityFinding(vulnerabilityParams);
    result.current.openVulnerabilityFindingAsChild(vulnerabilityParams, { title: 'my-host' });
    result.current.openHostFlyout(hostParams);
    result.current.openHostFlyoutAsChild(hostParams);
    result.current.openUserFlyout(userParams);
    result.current.openUserFlyoutAsChild(userParams);
    result.current.openEntityGraphView({
      entityId: 'entity-1',
      scopeId: '',
      entityName: 'host-1',
      onShowEntity: jest.fn(),
    });
    result.current.openIocFlyout(iocParams);
    result.current.openIocFlyoutAsChild(iocParams);
    result.current.openNetworkFlyout(networkParams);
    result.current.openNetworkFlyoutAsChild(networkParams);
    result.current.openRuleFlyout(ruleParams);
    result.current.openRuleFlyoutAsChild(ruleParams);

    expect(documentApi.openDocumentFlyoutFromIndex).toHaveBeenCalledWith(fromIndexParams);
    expect(documentApi.openDocumentFlyoutFromIndexAsChild).toHaveBeenCalledWith(fromIndexParams);
    expect(sharedToolsApi.openNotes).toHaveBeenCalledWith({ hit });
    expect(attackApi.openAttackFlyout).toHaveBeenCalledWith(attackParams);
    expect(attackApi.openAttackFlyoutAsChild).toHaveBeenCalledWith(attackParams);
    expect(cspApi.openMisconfigurationFinding).toHaveBeenCalledWith(misconfigurationParams);
    expect(cspApi.openMisconfigurationFindingAsChild).toHaveBeenCalledWith(misconfigurationParams, {
      title: 'my-host',
    });
    expect(cspApi.openVulnerabilityFinding).toHaveBeenCalledWith(vulnerabilityParams);
    expect(cspApi.openVulnerabilityFindingAsChild).toHaveBeenCalledWith(vulnerabilityParams, {
      title: 'my-host',
    });
    expect(entityApi.openHostFlyout).toHaveBeenCalledWith(hostParams);
    expect(entityApi.openHostFlyoutAsChild).toHaveBeenCalledWith(hostParams);
    expect(entityApi.openUserFlyout).toHaveBeenCalledWith(userParams);
    expect(entityApi.openUserFlyoutAsChild).toHaveBeenCalledWith(userParams);
    expect(entityApi.openEntityGraphView).toHaveBeenCalled();
    expect(iocApi.openIocFlyout).toHaveBeenCalledWith(iocParams);
    expect(iocApi.openIocFlyoutAsChild).toHaveBeenCalledWith(iocParams);
    expect(networkApi.openNetworkFlyout).toHaveBeenCalledWith(networkParams);
    expect(networkApi.openNetworkFlyoutAsChild).toHaveBeenCalledWith(networkParams);
    expect(ruleApi.openRuleFlyout).toHaveBeenCalledWith(ruleParams);
    expect(ruleApi.openRuleFlyoutAsChild).toHaveBeenCalledWith(ruleParams);
  });
});
