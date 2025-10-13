/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { TimelineEventsDetailsItem } from '@kbn/timelines-plugin/common';
import type { AppContextTestRender } from '../../mock/endpoint';
import { createAppRootMockRenderer, endpointAlertDataMock } from '../../mock/endpoint';
import {
  RESPONSE_ACTION_AGENT_TYPE,
  RESPONSE_ACTION_API_COMMANDS_NAMES,
  RESPONSE_ACTIONS_ALERT_AGENT_ID_FIELDS,
} from '../../../../common/endpoint/service/response_actions/constants';
import type { AlertResponseActionsSupport } from './use_alert_response_actions_support';
import {
  ALERT_EVENT_DATA_MISSING_AGENT_ID_FIELD,
  useAlertResponseActionsSupport,
} from './use_alert_response_actions_support';
import { isAgentTypeAndActionSupported } from '../../lib/endpoint';
import type { DeepPartial } from 'utility-types';
import { merge } from 'lodash';

jest.mock('../../experimental_features_service');

describe('When using `useAlertResponseActionsSupport()` hook', () => {
  let appContextMock: AppContextTestRender;
  let alertDetailItemData: TimelineEventsDetailsItem[];
  let renderHook: () => ReturnType<AppContextTestRender['renderHook']>;

  const getExpectedResult = (
    overrides: DeepPartial<AlertResponseActionsSupport> = {},
    options: Partial<{
      /* If true, then all properties in `agentSupport` will be false */
      noAgentSupport: boolean;
    }> = {}
  ): AlertResponseActionsSupport => {
    const agentType = overrides.details?.agentType ?? 'endpoint';

    return merge(
      {
        isAlert: true,
        isSupported: true,
        unsupportedReason: undefined,
        details: {
          agentId: 'abfe4a35-d5b4-42a0-a539-bd054c791769',
          agentIdField: RESPONSE_ACTIONS_ALERT_AGENT_ID_FIELDS[agentType][0],
          agentSupport: RESPONSE_ACTION_API_COMMANDS_NAMES.reduce((acc, commandName) => {
            acc[commandName] = options.noAgentSupport
              ? false
              : isAgentTypeAndActionSupported(agentType, commandName);
            return acc;
          }, {} as AlertResponseActionsSupport['details']['agentSupport']),
          agentType,
          hostName: 'elastic-host-win',
          platform: 'windows',
        },
      },
      overrides
    );
  };

  beforeEach(() => {
    appContextMock = createAppRootMockRenderer();

    alertDetailItemData = endpointAlertDataMock.generateEndpointAlertDetailsItemData();
    renderHook = () =>
      appContextMock.renderHook(() => useAlertResponseActionsSupport(alertDetailItemData));
  });

  it.each(RESPONSE_ACTION_AGENT_TYPE)(
    'should return expected response for agentType: `%s`',
    (agentType) => {
      alertDetailItemData =
        endpointAlertDataMock.generateAlertDetailsItemDataForAgentType(agentType);
      const { result } = renderHook();

      expect(result.current).toEqual(getExpectedResult({ details: { agentType } }));
    }
  );

  it('should set `isSupported` to `false` if no alert details item data is provided', () => {
    alertDetailItemData = [];

    expect(renderHook().result.current).toEqual(
      getExpectedResult(
        {
          isAlert: false,
          isSupported: false,
          details: {
            agentId: '',
            agentIdField: '',
            hostName: '',
            platform: '',
          },
        },
        { noAgentSupport: true }
      )
    );
  });

  it('should set `isSupported` to `true` for if it is not an Alert but supported', () => {
    alertDetailItemData = endpointAlertDataMock.generateAlertDetailsItemDataForAgentType(
      'sentinel_one',
      { 'kibana.alert.rule.uuid': undefined }
    );

    expect(renderHook().result.current).toEqual(
      getExpectedResult({
        isAlert: false,
        isSupported: true,
        details: {
          agentType: 'sentinel_one',
          agentIdField: RESPONSE_ACTIONS_ALERT_AGENT_ID_FIELDS.sentinel_one[0],
        },
      })
    );
  });

  it('should set `isSupported` to `false` if unable to get agent id', () => {
    alertDetailItemData = endpointAlertDataMock.generateEndpointAlertDetailsItemData({
      [RESPONSE_ACTIONS_ALERT_AGENT_ID_FIELDS.endpoint[0]]: undefined,
    });

    expect(renderHook().result.current).toEqual(
      getExpectedResult({
        isSupported: false,
        unsupportedReason: ALERT_EVENT_DATA_MISSING_AGENT_ID_FIELD('Elastic Defend', 'agent.id'),
        details: { agentId: '' },
      })
    );
  });

  it('should set `isSupported` to `false` if unable to determine agent type', () => {
    alertDetailItemData = endpointAlertDataMock.generateCrowdStrikeAlertDetailsItemData({
      'event.module': undefined,
    });

    expect(renderHook().result.current).toEqual(
      getExpectedResult(
        {
          isSupported: false,
          details: {
            agentId: '',
            agentIdField: '',
          },
        },
        { noAgentSupport: true }
      )
    );
  });

  it('should default `details.agentType` to `endpoint` for non-supported hosts', () => {
    alertDetailItemData = endpointAlertDataMock.generateAlertDetailsItemDataForAgentType('foo');

    expect(renderHook().result.current).toEqual(
      getExpectedResult(
        {
          isSupported: false,
          details: {
            agentId: '',
            agentIdField: '',
          },
        },
        { noAgentSupport: true }
      )
    );
  });
});
