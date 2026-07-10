/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { replaceAnonymizedValuesWithOriginalValues } from '@kbn/elastic-assistant-common';
import { ALERT_URL } from '@kbn/rule-data-utils';

import { generateAttackDiscoveryAlertHash, transformToBaseAlertDocument } from '.';
import { mockAttackDiscoveries } from '../../__mocks__/mock_attack_discoveries';
import { mockCreateAttackDiscoveryAlertsParams } from '../../__mocks__/mock_create_attack_discovery_alerts_params';
import {
  ALERT_ATTACK_DISCOVERY_DETAILS_MARKDOWN_WITH_REPLACEMENTS,
  ALERT_ATTACK_DISCOVERY_ENTITY_SUMMARY_MARKDOWN_WITH_REPLACEMENTS,
  ALERT_ATTACK_DISCOVERY_REPLACEMENTS,
  ALERT_RISK_SCORE,
  ALERT_ATTACK_DISCOVERY_ALERT_IDS,
  ALERT_ATTACK_DISCOVERY_ALERTS_CONTEXT_COUNT,
} from '../../fields/field_names';

describe('Transform attack discoveries to alert documents', () => {
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
    const computeSha256Hash = jest.fn().mockReturnValue('mocked-hash');

    const defaultProps = {
      computeSha256Hash,
      connectorId: 'test-connector-2',
      ownerId: 'test-user-2',
      replacements: undefined,
      spaceId: 'test-space-2',
    };

    beforeEach(() => {
      computeSha256Hash.mockClear();
    });

    it('generates a deterministic hash for the same attack discovery and space', () => {
      const hash1 = generateAttackDiscoveryAlertHash({
        ...defaultProps,
        attackDiscovery: mockAttackDiscoveries[0],
      });
      const hash2 = generateAttackDiscoveryAlertHash({
        ...defaultProps,
        attackDiscovery: mockAttackDiscoveries[0],
      });

      const [call1Input] = computeSha256Hash.mock.calls[0];
      const [call2Input] = computeSha256Hash.mock.calls[1];

      expect(call1Input).toBe(call2Input);
      expect(hash1).toBe(hash2);
    });

    it('generates different inputs for different attack discoveries', () => {
      generateAttackDiscoveryAlertHash({
        ...defaultProps,
        attackDiscovery: mockAttackDiscoveries[0],
      });
      generateAttackDiscoveryAlertHash({
        ...defaultProps,
        attackDiscovery: mockAttackDiscoveries[1],
      });

      const [call1Input] = computeSha256Hash.mock.calls[0];
      const [call2Input] = computeSha256Hash.mock.calls[1];
      expect(call1Input).not.toBe(call2Input);
    });

    it('generates different inputs for the same attack discovery in different spaces', () => {
      generateAttackDiscoveryAlertHash({
        ...defaultProps,
        attackDiscovery: mockAttackDiscoveries[0],
        spaceId: 'default',
      });
      generateAttackDiscoveryAlertHash({
        ...defaultProps,
        attackDiscovery: mockAttackDiscoveries[0],
        spaceId: 'other-space',
      });

      const [call1Input] = computeSha256Hash.mock.calls[0];
      const [call2Input] = computeSha256Hash.mock.calls[1];
      expect(call1Input).not.toBe(call2Input);
    });

    it('is not affected by alertIds order (sorts internally)', () => {
      const attackDiscoveryA = { ...mockAttackDiscoveries[0], alertIds: ['b', 'a', 'c'] };
      const attackDiscoveryB = { ...mockAttackDiscoveries[0], alertIds: ['c', 'b', 'a'] };

      generateAttackDiscoveryAlertHash({
        ...defaultProps,
        attackDiscovery: attackDiscoveryA,
      });
      generateAttackDiscoveryAlertHash({
        ...defaultProps,
        attackDiscovery: attackDiscoveryB,
      });

      const [call1Input] = computeSha256Hash.mock.calls[0];
      const [call2Input] = computeSha256Hash.mock.calls[1];
      expect(call1Input).toBe(call2Input);
    });

    it('generates different inputs for attack discovery with anonymized id field and without', () => {
      const attackDiscovery = { ...mockAttackDiscoveries[0], alertIds: ['a', 'b', 'c'] };
      const replacements = { a: 'alert1', b: 'alert2', c: 'alert3' };

      generateAttackDiscoveryAlertHash({
        ...defaultProps,
        attackDiscovery,
        replacements,
      });
      generateAttackDiscoveryAlertHash({
        ...defaultProps,
        attackDiscovery,
      });

      const [call1Input] = computeSha256Hash.mock.calls[0];
      const [call2Input] = computeSha256Hash.mock.calls[1];
      expect(call1Input).not.toBe(call2Input);
    });

    it('generates the same input for the same de-anonymized id values', () => {
      const attackDiscoveryA = { ...mockAttackDiscoveries[0], alertIds: ['a', 'b', 'c'] };
      const replacementsA = { a: 'alert1', b: 'alert2', c: 'alert3' };

      const attackDiscoveryB = { ...mockAttackDiscoveries[0], alertIds: ['d', 'e', 'f'] };
      const replacementsB = { d: 'alert1', e: 'alert2', f: 'alert3' };

      generateAttackDiscoveryAlertHash({
        ...defaultProps,
        attackDiscovery: attackDiscoveryA,
        replacements: replacementsA,
      });
      generateAttackDiscoveryAlertHash({
        ...defaultProps,
        attackDiscovery: attackDiscoveryB,
        replacements: replacementsB,
      });

      const [call1Input] = computeSha256Hash.mock.calls[0];
      const [call2Input] = computeSha256Hash.mock.calls[1];
      expect(call1Input).toBe(call2Input);
    });

    it('returns the value from computeSha256Hash', () => {
      computeSha256Hash.mockReturnValue('expected-hash-value');

      const result = generateAttackDiscoveryAlertHash({
        ...defaultProps,
        attackDiscovery: mockAttackDiscoveries[0],
      });

      expect(result).toBe('expected-hash-value');
    });
  });
});
