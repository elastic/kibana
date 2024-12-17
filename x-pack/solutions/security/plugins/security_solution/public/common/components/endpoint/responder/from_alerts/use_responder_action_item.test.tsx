/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useResponderActionItem } from './use_responder_action_item';
import { useUserPrivileges as _useUserPrivileges } from '../../../user_privileges';
import type { TimelineEventsDetailsItem } from '@kbn/timelines-plugin/common';
import type { AppContextTestRender } from '../../../../mock/endpoint';
import { createAppRootMockRenderer } from '../../../../mock/endpoint';
import { endpointAlertDataMock } from '../../../../mock/endpoint/endpoint_alert_data_mock';

jest.mock('../../../user_privileges');
jest.mock('./use_responder_action_data');

const useUserPrivilegesMock = _useUserPrivileges as jest.Mock;

describe('useResponderActionItem', () => {
  let alertDetailItemData: TimelineEventsDetailsItem[];
  let renderHook: () => ReturnType<AppContextTestRender['renderHook']>;

  beforeEach(() => {
    const appContextMock = createAppRootMockRenderer();

    // This is on purpose - an alert for an unsupported agent type. The menu item should always be
    // visible as long as the user has authz to it. In this case it will be disabled.
    alertDetailItemData = endpointAlertDataMock.generateAlertDetailsItemDataForAgentType('foo');

    renderHook = () =>
      appContextMock.renderHook(() => useResponderActionItem(alertDetailItemData, () => {}));

    useUserPrivilegesMock.mockReturnValue({
      endpointPrivileges: { loading: false, canAccessResponseConsole: true },
    });
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should return Respond action menu item if user has Authz', () => {
    expect(renderHook().result.current).toHaveLength(1);
  });

  it('should NOT return the Respond action menu item if user is not Authorized', () => {
    useUserPrivilegesMock.mockReturnValue({
      endpointPrivileges: { loading: false, canAccessResponseConsole: false },
    });
    expect(renderHook().result.current).toHaveLength(0);
  });

  it('should NOT return the Respond action menu item for Events', () => {
    alertDetailItemData = endpointAlertDataMock.generateAlertDetailsItemDataForAgentType('foo', {
      'kibana.alert.rule.uuid': undefined,
    });

    expect(renderHook().result.current).toHaveLength(0);
  });
});
