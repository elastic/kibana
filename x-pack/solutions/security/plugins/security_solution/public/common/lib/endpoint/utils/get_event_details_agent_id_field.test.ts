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

  describe('for microsoft_defender_endpoint', () => {
    const MDE_ID = 'f8c1b8e4a1d3c2b1a09f8e7d6c5b4a3928170615';
    const EVIDENCE_INSTANCE_ID = '64a7162b-1111-2222-3333-444455556666';
    const [alertField, incidentField, cloudField] =
      RESPONSE_ACTIONS_ALERT_AGENT_ID_FIELDS.microsoft_defender_endpoint;
    const withValue = (field: string, value: string) => ({
      category: parseEcsFieldPath(field).category,
      field,
      values: [value],
      originalValue: [value],
    });
    const getEventDetails = (
      overrides: Parameters<
        typeof endpointAlertDataMock.generateAlertDetailsItemDataForAgentType
      >[1] = {}
    ) =>
      endpointAlertDataMock.generateAlertDetailsItemDataForAgentType(
        'microsoft_defender_endpoint',
        {
          [alertField]: undefined,
          [incidentField]: undefined,
          [cloudField]: undefined,
          ...overrides,
        }
      );

    it('should return the m365_defender alert `mde_device_id` over `cloud.instance.id`', () => {
      expect(
        getEventDetailsAgentIdField(
          'microsoft_defender_endpoint',
          getEventDetails({
            [cloudField]: withValue(cloudField, EVIDENCE_INSTANCE_ID),
            [alertField]: withValue(alertField, MDE_ID),
          })
        )
      ).toEqual(expect.objectContaining({ found: true, field: alertField, agentId: MDE_ID }));
    });

    it('should return the m365_defender incident `mde_device_id` over `cloud.instance.id`', () => {
      expect(
        getEventDetailsAgentIdField(
          'microsoft_defender_endpoint',
          getEventDetails({
            [cloudField]: withValue(cloudField, EVIDENCE_INSTANCE_ID),
            [incidentField]: withValue(incidentField, MDE_ID),
          })
        )
      ).toEqual(expect.objectContaining({ found: true, field: incidentField, agentId: MDE_ID }));
    });

    it('should return `cloud.instance.id` when no `mde_device_id` field is present', () => {
      expect(
        getEventDetailsAgentIdField(
          'microsoft_defender_endpoint',
          getEventDetails({ [cloudField]: withValue(cloudField, MDE_ID) })
        )
      ).toEqual(expect.objectContaining({ found: true, field: cloudField, agentId: MDE_ID }));
    });
  });
});
