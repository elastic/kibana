/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { endpointAlertDataMock } from '../../../mock/endpoint';
import {
  RESPONSE_ACTION_AGENT_TYPE,
  RESPONSE_ACTIONS_ALERT_AGENT_ID_FIELDS,
} from '../../../../../common/endpoint/service/response_actions/constants';
import { getEventDetailsAgentIdField, parseEcsFieldPath } from '..';

describe('getEventDetailsAgentIdField()', () => {
  it.each(RESPONSE_ACTION_AGENT_TYPE)(`should return agent id info for %s`, (agentType) => {
    const field = RESPONSE_ACTIONS_ALERT_AGENT_ID_FIELDS[agentType][0];
    const eventDetails = endpointAlertDataMock.generateAlertDetailsItemDataForAgentType(agentType);

    expect(getEventDetailsAgentIdField(agentType, eventDetails)).toEqual({
      found: true,
      category: parseEcsFieldPath(field).category,
      field,
      agentId: 'abfe4a35-d5b4-42a0-a539-bd054c791769',
    });
  });

  it.each(RESPONSE_ACTION_AGENT_TYPE)(
    'should include a field when agent id is not found: %s',
    (agentType) => {
      const field = RESPONSE_ACTIONS_ALERT_AGENT_ID_FIELDS[agentType][0];
      const eventDetails = endpointAlertDataMock.generateAlertDetailsItemDataForAgentType(
        agentType,
        {
          'event.dataset': { values: ['foo'], originalValue: ['foo'] },
          [field]: undefined,
        }
      );

      expect(getEventDetailsAgentIdField(agentType, eventDetails)).toEqual({
        found: false,
        category: parseEcsFieldPath(field).category,
        field,
        agentId: '',
      });
    }
  );

  it.each(RESPONSE_ACTIONS_ALERT_AGENT_ID_FIELDS.sentinel_one)(
    'should return field [%s] for sentinelone when agent is not found and event.dataset matches',
    (field) => {
      const dataset = field.split('.').slice(0, 2).join('.');
      const eventDetails = endpointAlertDataMock.generateAlertDetailsItemDataForAgentType(
        'sentinel_one',
        {
          'event.dataset': { values: [dataset], originalValue: [dataset] },
          // Make sure we remove the default agentId field from the mock data
          [RESPONSE_ACTIONS_ALERT_AGENT_ID_FIELDS.sentinel_one[0]]: undefined,
        }
      );

      expect(getEventDetailsAgentIdField('sentinel_one', eventDetails)).toEqual({
        found: false,
        category: parseEcsFieldPath(field).category,
        agentId: '',
        field,
      });
    }
  );
});
