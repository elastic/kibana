/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  replaceAnonymizedValuesWithOriginalValues,
  ATTACK_DISCOVERY_AD_HOC_RULE_TYPE_ID,
  ATTACK_DISCOVERY_AD_HOC_RULE_ID,
  type CreateAttackDiscoveryAlertsParams,
} from '@kbn/elastic-assistant-common';
import {
  ALERT_INSTANCE_ID,
  ALERT_RULE_CATEGORY,
  ALERT_RULE_NAME,
  ALERT_RULE_TYPE_ID,
  ALERT_RULE_UUID,
  ALERT_UUID,
} from '@kbn/rule-data-utils';
import {
  ALERT_ATTACK_DISCOVERY_DETAILS_MARKDOWN_WITH_REPLACEMENTS,
  ALERT_ATTACK_DISCOVERY_ENTITY_SUMMARY_MARKDOWN_WITH_REPLACEMENTS,
  ALERT_ATTACK_DISCOVERY_REPLACEMENTS,
  ALERT_ATTACK_DISCOVERY_USER_ID,
  ALERT_ATTACK_DISCOVERY_USER_NAME,
  ALERT_ATTACK_DISCOVERY_USERS,
  ALERT_RISK_SCORE,
  ALERT_ATTACK_DISCOVERY_ALERT_IDS,
  ALERT_ATTACK_DISCOVERY_ALERTS_CONTEXT_COUNT,
} from '../../../schedules/fields/field_names';
import { v4 as uuidv4 } from 'uuid';

import { transformToAlertDocuments } from '.';
import { mockAuthenticatedUser } from '../../../../../__mocks__/mock_authenticated_user';
import { mockCreateAttackDiscoveryAlertsParams } from '../../../../../__mocks__/mock_create_attack_discovery_alerts_params';

jest.mock('uuid', () => ({
  v4: jest.fn(),
}));

describe('transformToAlertDocuments', () => {
  const mockNow = new Date('2025-04-24T17:36:25.812Z');
  const spaceId = 'default';

  beforeEach(() => {
    jest.resetAllMocks();

    (uuidv4 as unknown as jest.Mock)
      .mockImplementationOnce(() => '879B171F-428B-4B23-99C3-EDE33334AB71')
      .mockImplementationOnce(() => '123B171F-428B-4B23-99C3-EDE33334AB72');
  });

  it(`returns the expected ${ALERT_ATTACK_DISCOVERY_ALERT_IDS} field`, () => {
    const result = transformToAlertDocuments({
      authenticatedUser: mockAuthenticatedUser,
      createAttackDiscoveryAlertsParams: mockCreateAttackDiscoveryAlertsParams,
      now: mockNow,
      spaceId,
    });

    expect(result[0][ALERT_ATTACK_DISCOVERY_ALERT_IDS]).toEqual(
      mockCreateAttackDiscoveryAlertsParams.attackDiscoveries[0].alertIds
    );
  });

  it(`returns an empty array for ${ALERT_ATTACK_DISCOVERY_ALERT_IDS} if no alertIds are provided`, () => {
    const params = {
      ...mockCreateAttackDiscoveryAlertsParams,
      attackDiscoveries: [
        {
          ...mockCreateAttackDiscoveryAlertsParams.attackDiscoveries[0],
          alertIds: [],
        },
      ],
    };

    const result = transformToAlertDocuments({
      authenticatedUser: mockAuthenticatedUser,
      createAttackDiscoveryAlertsParams: params,
      now: mockNow,
      spaceId,
    });

    expect(result[0][ALERT_ATTACK_DISCOVERY_ALERT_IDS]).toEqual([]);
  });

  it(`returns the expected ${ALERT_ATTACK_DISCOVERY_ALERTS_CONTEXT_COUNT} field`, () => {
    const result = transformToAlertDocuments({
      authenticatedUser: mockAuthenticatedUser,
      createAttackDiscoveryAlertsParams: mockCreateAttackDiscoveryAlertsParams,
      now: mockNow,
      spaceId,
    });

    expect(result[0][ALERT_ATTACK_DISCOVERY_ALERTS_CONTEXT_COUNT]).toEqual(
      mockCreateAttackDiscoveryAlertsParams.alertsContextCount
    );
  });

  it(`returns the expected ${ALERT_UUID}`, () => {
    uuidv4 as unknown as jest.Mock;

    const result = transformToAlertDocuments({
      authenticatedUser: mockAuthenticatedUser,
      createAttackDiscoveryAlertsParams: mockCreateAttackDiscoveryAlertsParams,
      now: mockNow,
      spaceId,
    });

    expect(result[0][ALERT_UUID]).toBe('879B171F-428B-4B23-99C3-EDE33334AB71');
  });

  it(`returns the same ${ALERT_INSTANCE_ID} as the ${ALERT_UUID}`, () => {
    const result = transformToAlertDocuments({
      authenticatedUser: mockAuthenticatedUser,
      createAttackDiscoveryAlertsParams: mockCreateAttackDiscoveryAlertsParams,
      now: mockNow,
      spaceId,
    });

    expect(result[0][ALERT_INSTANCE_ID]).toEqual(result[0][ALERT_UUID]);
  });

  it(`returns the expected ${ALERT_RISK_SCORE}`, () => {
    const result = transformToAlertDocuments({
      authenticatedUser: mockAuthenticatedUser,
      createAttackDiscoveryAlertsParams: mockCreateAttackDiscoveryAlertsParams,
      now: mockNow,
      spaceId,
    });

    expect(result[0][ALERT_RISK_SCORE]).toEqual(1316);
  });

  it(`returns the expected ${ALERT_ATTACK_DISCOVERY_USER_ID}`, () => {
    const result = transformToAlertDocuments({
      authenticatedUser: mockAuthenticatedUser,
      createAttackDiscoveryAlertsParams: mockCreateAttackDiscoveryAlertsParams,
      now: mockNow,
      spaceId,
    });

    expect(result[0][ALERT_ATTACK_DISCOVERY_USER_ID]).toEqual(mockAuthenticatedUser.profile_uid);
  });

  it(`returns the expected ${ALERT_ATTACK_DISCOVERY_USER_NAME}`, () => {
    const result = transformToAlertDocuments({
      authenticatedUser: mockAuthenticatedUser,
      createAttackDiscoveryAlertsParams: mockCreateAttackDiscoveryAlertsParams,
      now: mockNow,
      spaceId,
    });

    expect(result[0][ALERT_ATTACK_DISCOVERY_USER_NAME]).toEqual(mockAuthenticatedUser.username);
  });

  it(`returns the expected ${ALERT_ATTACK_DISCOVERY_USERS}`, () => {
    const result = transformToAlertDocuments({
      authenticatedUser: mockAuthenticatedUser,
      createAttackDiscoveryAlertsParams: mockCreateAttackDiscoveryAlertsParams,
      now: mockNow,
      spaceId,
    });

    expect(result[0][ALERT_ATTACK_DISCOVERY_USERS]).toEqual([
      {
        id: mockAuthenticatedUser.profile_uid,
        name: mockAuthenticatedUser.username,
      },
    ]);
  });

  it('generates unique UUIDs for multiple alerts', () => {
    const params = {
      authenticatedUser: mockAuthenticatedUser,
      createAttackDiscoveryAlertsParams: mockCreateAttackDiscoveryAlertsParams,
      now: mockNow,
      spaceId,
    };

    const result = transformToAlertDocuments(params);

    const uuids = result.map((alert) => alert[ALERT_UUID]);
    expect(uuids).toEqual([
      '879B171F-428B-4B23-99C3-EDE33334AB71',
      '123B171F-428B-4B23-99C3-EDE33334AB72',
    ]);
  });

  it(`returns the expected ${ALERT_ATTACK_DISCOVERY_DETAILS_MARKDOWN_WITH_REPLACEMENTS}`, () => {
    const result = transformToAlertDocuments({
      authenticatedUser: mockAuthenticatedUser,
      createAttackDiscoveryAlertsParams: mockCreateAttackDiscoveryAlertsParams,
      now: mockNow,
      spaceId,
    });

    expect(result[0][ALERT_ATTACK_DISCOVERY_DETAILS_MARKDOWN_WITH_REPLACEMENTS]).toEqual(
      replaceAnonymizedValuesWithOriginalValues({
        messageContent: mockCreateAttackDiscoveryAlertsParams.attackDiscoveries[0].detailsMarkdown,
        replacements: mockCreateAttackDiscoveryAlertsParams.replacements ?? {},
      })
    );
  });

  it('handles undefined entitySummaryMarkdown correctly', () => {
    const params: CreateAttackDiscoveryAlertsParams = {
      ...mockCreateAttackDiscoveryAlertsParams,
      attackDiscoveries: [
        {
          ...mockCreateAttackDiscoveryAlertsParams.attackDiscoveries[0],
          entitySummaryMarkdown: undefined, // <-- undefined
        },
      ],
    };

    const result = transformToAlertDocuments({
      authenticatedUser: mockAuthenticatedUser,
      createAttackDiscoveryAlertsParams: params,
      now: mockNow,
      spaceId,
    });

    expect(
      result[0][ALERT_ATTACK_DISCOVERY_ENTITY_SUMMARY_MARKDOWN_WITH_REPLACEMENTS]
    ).toBeUndefined();
  });

  it(`returns the expected ${ALERT_ATTACK_DISCOVERY_REPLACEMENTS}`, () => {
    const result = transformToAlertDocuments({
      authenticatedUser: mockAuthenticatedUser,
      createAttackDiscoveryAlertsParams: mockCreateAttackDiscoveryAlertsParams,
      now: mockNow,
      spaceId,
    });

    expect(result[0][ALERT_ATTACK_DISCOVERY_REPLACEMENTS]).toEqual(
      Object.entries(mockCreateAttackDiscoveryAlertsParams.replacements ?? {}).map(
        ([uuid, value]) => ({
          uuid,
          value,
        })
      )
    );
  });

  it('returns the expected static ALERT_RULE* fields', () => {
    const result = transformToAlertDocuments({
      authenticatedUser: mockAuthenticatedUser,
      createAttackDiscoveryAlertsParams: mockCreateAttackDiscoveryAlertsParams,
      now: mockNow,
      spaceId,
    });

    expect(result[0][ALERT_RULE_CATEGORY]).toBe(
      'Attack discovery ad hoc (placeholder rule category)'
    );
    expect(result[0][ALERT_RULE_NAME]).toBe('Attack discovery ad hoc (placeholder rule name)');
    expect(result[0][ALERT_RULE_TYPE_ID]).toBe(ATTACK_DISCOVERY_AD_HOC_RULE_TYPE_ID);
    expect(result[0][ALERT_RULE_UUID]).toBe(ATTACK_DISCOVERY_AD_HOC_RULE_ID);
  });

  it('handles empty replacements correctly', () => {
    const params = {
      ...mockCreateAttackDiscoveryAlertsParams,
      replacements: {},
    };

    const result = transformToAlertDocuments({
      authenticatedUser: mockAuthenticatedUser,
      createAttackDiscoveryAlertsParams: params,
      now: mockNow,
      spaceId,
    });

    expect(result[0][ALERT_ATTACK_DISCOVERY_REPLACEMENTS]).toBeUndefined();
  });
});
