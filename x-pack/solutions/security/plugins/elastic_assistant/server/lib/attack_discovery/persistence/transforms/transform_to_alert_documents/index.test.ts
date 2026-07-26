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
} from '@kbn/elastic-assistant-common';

import { transformToAlertDocuments } from '.';
import { mockAuthenticatedUser } from '../../../../../__mocks__/mock_authenticated_user';
import { mockCreateAttackDiscoveryAlertsParams } from '../../../../../__mocks__/mock_create_attack_discovery_alerts_params';

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

    it('returns undefined for replacements when replacements is undefined', () => {
      const params = {
        ...mockCreateAttackDiscoveryAlertsParams,
        replacements: undefined,
      };

      const result = transformToAlertDocuments({
        ...defaultProps,
        authenticatedUser: mockAuthenticatedUser,
        createAttackDiscoveryAlertsParams: params,
        now: mockNow,
      });

      expect(result[0][ALERT_ATTACK_DISCOVERY_REPLACEMENTS]).toBeUndefined();
    });

    it('returns undefined for entitySummaryMarkdown_with_replacements when entitySummaryMarkdown is an empty string', () => {
      const params = {
        ...mockCreateAttackDiscoveryAlertsParams,
        attackDiscoveries: [
          {
            ...mockCreateAttackDiscoveryAlertsParams.attackDiscoveries[0],
            entitySummaryMarkdown: '',
          },
        ],
      };

      const result = transformToAlertDocuments({
        ...defaultProps,
        authenticatedUser: mockAuthenticatedUser,
        createAttackDiscoveryAlertsParams: params,
        now: mockNow,
      });

      expect(result[0][ALERT_ATTACK_DISCOVERY_ENTITY_SUMMARY_MARKDOWN_WITH_REPLACEMENTS]).toEqual(
        replaceAnonymizedValuesWithOriginalValues({
          messageContent: '',
          replacements: params.replacements ?? {},
        })
      );
    });
  });
});
