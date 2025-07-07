/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  ATTACK_DISCOVERY_AD_HOC_RULE_ID,
  ATTACK_DISCOVERY_AD_HOC_RULE_TYPE_ID,
  replaceAnonymizedValuesWithOriginalValues,
  type CreateAttackDiscoveryAlertsParams,
} from '@kbn/elastic-assistant-common';
import {
  ALERT_INSTANCE_ID,
  ALERT_RULE_CATEGORY,
  ALERT_RULE_NAME,
  ALERT_RULE_TYPE_ID,
  ALERT_RULE_UUID,
  ALERT_URL,
  ALERT_UUID,
} from '@kbn/rule-data-utils';

import {
  generateAttackDiscoveryAlertHash,
  transformToAlertDocuments,
  transformToBaseAlertDocument,
} from '.';
import { mockAttackDiscoveries } from '../../../evaluation/__mocks__/mock_attack_discoveries';
import { mockAuthenticatedUser } from '../../../../../__mocks__/mock_authenticated_user';
import { mockCreateAttackDiscoveryAlertsParams } from '../../../../../__mocks__/mock_create_attack_discovery_alerts_params';
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

describe('Transform attack discoveries to alert documents', () => {
  describe('transformToAlertDocuments', () => {
    const mockNow = new Date('2025-04-24T17:36:25.812Z');
    const defaultProps = {
      authenticatedUser: mockAuthenticatedUser,
      connectorId: 'test-connector-1',
      createAttackDiscoveryAlertsParams: mockCreateAttackDiscoveryAlertsParams,
      now: mockNow,
      spaceId: 'test-space-1',
    };

    beforeEach(() => {
      jest.resetAllMocks();
    });

    it(`returns the expected ${ALERT_ATTACK_DISCOVERY_ALERT_IDS} field`, () => {
      const result = transformToAlertDocuments(defaultProps);

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
        ...defaultProps,
        createAttackDiscoveryAlertsParams: params,
      });

      expect(result[0][ALERT_ATTACK_DISCOVERY_ALERT_IDS]).toEqual([]);
    });

    it(`returns the expected ${ALERT_ATTACK_DISCOVERY_ALERTS_CONTEXT_COUNT} field`, () => {
      const result = transformToAlertDocuments(defaultProps);

      expect(result[0][ALERT_ATTACK_DISCOVERY_ALERTS_CONTEXT_COUNT]).toEqual(
        mockCreateAttackDiscoveryAlertsParams.alertsContextCount
      );
    });

    it(`returns the expected ${ALERT_UUID}`, () => {
      const result = transformToAlertDocuments(defaultProps);

      expect(result[0][ALERT_UUID]).toBe(
        'bbcce335305e816a8603787f5e74f938d7fbbb810b28e707ba82a8d864ed90f5'
      );
    });

    it(`returns the same ${ALERT_INSTANCE_ID} as the ${ALERT_UUID}`, () => {
      const result = transformToAlertDocuments(defaultProps);

      expect(result[0][ALERT_INSTANCE_ID]).toEqual(result[0][ALERT_UUID]);
    });

    it(`returns the expected ${ALERT_RISK_SCORE}`, () => {
      const result = transformToAlertDocuments(defaultProps);

      expect(result[0][ALERT_RISK_SCORE]).toEqual(1316);
    });

    it(`returns the expected ${ALERT_ATTACK_DISCOVERY_USER_ID}`, () => {
      const result = transformToAlertDocuments(defaultProps);

      expect(result[0][ALERT_ATTACK_DISCOVERY_USER_ID]).toEqual(mockAuthenticatedUser.profile_uid);
    });

    it(`returns the expected ${ALERT_ATTACK_DISCOVERY_USER_NAME}`, () => {
      const result = transformToAlertDocuments(defaultProps);

      expect(result[0][ALERT_ATTACK_DISCOVERY_USER_NAME]).toEqual(mockAuthenticatedUser.username);
    });

    it(`returns the expected ${ALERT_ATTACK_DISCOVERY_USERS}`, () => {
      const result = transformToAlertDocuments(defaultProps);

      expect(result[0][ALERT_ATTACK_DISCOVERY_USERS]).toEqual([
        {
          id: mockAuthenticatedUser.profile_uid,
          name: mockAuthenticatedUser.username,
        },
      ]);
    });

    it('generates unique UUIDs for multiple alerts', () => {
      const result = transformToAlertDocuments(defaultProps);

      const uuids = result.map((alert) => alert[ALERT_UUID]);
      expect(uuids).toEqual([
        'bbcce335305e816a8603787f5e74f938d7fbbb810b28e707ba82a8d864ed90f5',
        '0a5cbb77551efa52f4ed4862d8ad1beab2b9e8628993e3d1597a7924601d1c6b',
      ]);
    });

    it(`returns the expected ${ALERT_ATTACK_DISCOVERY_DETAILS_MARKDOWN_WITH_REPLACEMENTS}`, () => {
      const result = transformToAlertDocuments({
        ...defaultProps,
        authenticatedUser: mockAuthenticatedUser,
        createAttackDiscoveryAlertsParams: mockCreateAttackDiscoveryAlertsParams,
        now: mockNow,
      });

      expect(result[0][ALERT_ATTACK_DISCOVERY_DETAILS_MARKDOWN_WITH_REPLACEMENTS]).toEqual(
        replaceAnonymizedValuesWithOriginalValues({
          messageContent:
            mockCreateAttackDiscoveryAlertsParams.attackDiscoveries[0].detailsMarkdown,
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
        ...defaultProps,
        authenticatedUser: mockAuthenticatedUser,
        createAttackDiscoveryAlertsParams: params,
        now: mockNow,
      });

      expect(
        result[0][ALERT_ATTACK_DISCOVERY_ENTITY_SUMMARY_MARKDOWN_WITH_REPLACEMENTS]
      ).toBeUndefined();
    });

    it(`returns the expected ${ALERT_ATTACK_DISCOVERY_REPLACEMENTS}`, () => {
      const result = transformToAlertDocuments({
        ...defaultProps,
        authenticatedUser: mockAuthenticatedUser,
        createAttackDiscoveryAlertsParams: mockCreateAttackDiscoveryAlertsParams,
        now: mockNow,
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
        ...defaultProps,
        authenticatedUser: mockAuthenticatedUser,
        createAttackDiscoveryAlertsParams: mockCreateAttackDiscoveryAlertsParams,
        now: mockNow,
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
        ...defaultProps,
        authenticatedUser: mockAuthenticatedUser,
        createAttackDiscoveryAlertsParams: params,
        now: mockNow,
      });

      expect(result[0][ALERT_ATTACK_DISCOVERY_REPLACEMENTS]).toBeUndefined();
    });
  });

  describe('transformToBaseAlertDocument', () => {
    const { attackDiscoveries, generationUuid, ...alertsParams } =
      mockCreateAttackDiscoveryAlertsParams;
    const spaceId = 'default';
    const alertDocId = 'test-alert-id';
    const alertInstanceId = 'test-alert-instance-id';

    beforeEach(() => {
      jest.resetAllMocks();
    });

    it(`returns the expected ${ALERT_ATTACK_DISCOVERY_ALERT_IDS} field`, () => {
      const baseAlertDocument = transformToBaseAlertDocument({
        alertDocId,
        alertInstanceId,
        attackDiscovery: attackDiscoveries[0],
        alertsParams,
        spaceId,
      });

      expect(baseAlertDocument[ALERT_ATTACK_DISCOVERY_ALERT_IDS]).toEqual(
        mockCreateAttackDiscoveryAlertsParams.attackDiscoveries[0].alertIds
      );
    });

    it(`returns an empty array for ${ALERT_ATTACK_DISCOVERY_ALERT_IDS} if no alertIds are provided`, () => {
      const baseAlertDocument = transformToBaseAlertDocument({
        alertDocId,
        alertInstanceId,
        attackDiscovery: {
          ...mockCreateAttackDiscoveryAlertsParams.attackDiscoveries[0],
          alertIds: [],
        },
        alertsParams,
        spaceId,
      });

      expect(baseAlertDocument[ALERT_ATTACK_DISCOVERY_ALERT_IDS]).toEqual([]);
    });

    it(`returns the expected ${ALERT_ATTACK_DISCOVERY_ALERTS_CONTEXT_COUNT} field`, () => {
      const baseAlertDocument = transformToBaseAlertDocument({
        alertDocId,
        alertInstanceId,
        attackDiscovery: attackDiscoveries[0],
        alertsParams,
        spaceId,
      });

      expect(baseAlertDocument[ALERT_ATTACK_DISCOVERY_ALERTS_CONTEXT_COUNT]).toEqual(
        mockCreateAttackDiscoveryAlertsParams.alertsContextCount
      );
    });

    it(`returns the expected ${ALERT_RISK_SCORE}`, () => {
      const baseAlertDocument = transformToBaseAlertDocument({
        alertDocId,
        alertInstanceId,
        attackDiscovery: attackDiscoveries[0],
        alertsParams,
        spaceId,
      });

      expect(baseAlertDocument[ALERT_RISK_SCORE]).toEqual(1316);
    });

    it(`returns the expected ${ALERT_ATTACK_DISCOVERY_DETAILS_MARKDOWN_WITH_REPLACEMENTS}`, () => {
      const baseAlertDocument = transformToBaseAlertDocument({
        alertDocId,
        alertInstanceId,
        attackDiscovery: attackDiscoveries[0],
        alertsParams,
        spaceId,
      });

      expect(baseAlertDocument[ALERT_ATTACK_DISCOVERY_DETAILS_MARKDOWN_WITH_REPLACEMENTS]).toEqual(
        replaceAnonymizedValuesWithOriginalValues({
          messageContent:
            mockCreateAttackDiscoveryAlertsParams.attackDiscoveries[0].detailsMarkdown,
          replacements: mockCreateAttackDiscoveryAlertsParams.replacements ?? {},
        })
      );
    });

    it('handles undefined entitySummaryMarkdown correctly', () => {
      const baseAlertDocument = transformToBaseAlertDocument({
        alertDocId,
        alertInstanceId,
        attackDiscovery: {
          ...mockCreateAttackDiscoveryAlertsParams.attackDiscoveries[0],
          entitySummaryMarkdown: undefined, // <-- undefined
        },
        alertsParams,
        spaceId,
      });

      expect(
        baseAlertDocument[ALERT_ATTACK_DISCOVERY_ENTITY_SUMMARY_MARKDOWN_WITH_REPLACEMENTS]
      ).toBeUndefined();
    });

    it(`returns the expected ${ALERT_ATTACK_DISCOVERY_REPLACEMENTS}`, () => {
      const baseAlertDocument = transformToBaseAlertDocument({
        alertDocId,
        alertInstanceId,
        attackDiscovery: attackDiscoveries[0],
        alertsParams,
        spaceId,
      });

      expect(baseAlertDocument[ALERT_ATTACK_DISCOVERY_REPLACEMENTS]).toEqual(
        Object.entries(mockCreateAttackDiscoveryAlertsParams.replacements ?? {}).map(
          ([uuid, value]) => ({
            uuid,
            value,
          })
        )
      );
    });

    it('handles empty replacements correctly', () => {
      const baseAlertDocument = transformToBaseAlertDocument({
        alertDocId,
        alertInstanceId,
        attackDiscovery: attackDiscoveries[0],
        alertsParams: {
          ...alertsParams,
          replacements: {},
        },
        spaceId,
      });

      expect(baseAlertDocument[ALERT_ATTACK_DISCOVERY_REPLACEMENTS]).toBeUndefined();
    });

    it(`returns the expected ${ALERT_URL}`, () => {
      const result = transformToBaseAlertDocument({
        alertDocId,
        alertInstanceId,
        attackDiscovery: attackDiscoveries[0],
        alertsParams,
        publicBaseUrl: 'http://jest.com/test',
        spaceId: 'very-nice-space',
      });

      expect(result[ALERT_URL]).toEqual(
        'http://jest.com/test/s/very-nice-space/app/security/attack_discovery?id=test-alert-id'
      );
    });
  });

  describe('generateAttackDiscoveryAlertHash', () => {
    const defaultProps = {
      spaceId: 'test-space-2',
      connectorId: 'test-connector-2',
      ownerId: 'test-user-2',
    };

    it('generates a deterministic UUID for the same attack discovery and space', () => {
      const uuid1a = generateAttackDiscoveryAlertHash({
        ...defaultProps,
        attackDiscovery: mockAttackDiscoveries[0],
      });
      const uuid1b = generateAttackDiscoveryAlertHash({
        ...defaultProps,
        attackDiscovery: mockAttackDiscoveries[0],
      });
      expect(uuid1a).toBe(uuid1b);
    });

    it('generates different UUIDs for different attack discoveries', () => {
      const uuid1 = generateAttackDiscoveryAlertHash({
        ...defaultProps,
        attackDiscovery: mockAttackDiscoveries[0],
      });
      const uuid2 = generateAttackDiscoveryAlertHash({
        ...defaultProps,
        attackDiscovery: mockAttackDiscoveries[1],
      });
      expect(uuid1).not.toBe(uuid2);
    });

    it('generates different UUIDs for the same attack discovery in different spaces', () => {
      const uuidDefault = generateAttackDiscoveryAlertHash({
        ...defaultProps,
        attackDiscovery: mockAttackDiscoveries[0],
        spaceId: 'default',
      });
      const uuidOther = generateAttackDiscoveryAlertHash({
        ...defaultProps,
        attackDiscovery: mockAttackDiscoveries[0],
        spaceId: 'other-space',
      });
      expect(uuidDefault).not.toBe(uuidOther);
    });

    it('is not affected by alertIds order (sorts internally)', () => {
      const attackDiscoveryA = { ...mockAttackDiscoveries[0], alertIds: ['b', 'a', 'c'] };
      const attackDiscoveryB = { ...mockAttackDiscoveries[0], alertIds: ['c', 'b', 'a'] };
      const uuidA = generateAttackDiscoveryAlertHash({
        ...defaultProps,
        attackDiscovery: attackDiscoveryA,
      });
      const uuidB = generateAttackDiscoveryAlertHash({
        ...defaultProps,
        attackDiscovery: attackDiscoveryB,
      });
      expect(uuidA).toBe(uuidB);
    });
  });
});
