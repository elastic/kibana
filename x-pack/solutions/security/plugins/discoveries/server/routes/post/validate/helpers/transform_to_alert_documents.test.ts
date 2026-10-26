/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { AuthenticatedUser } from '@kbn/core/server';
import { ALERT_RISK_SCORE, ALERT_UUID } from '@kbn/rule-data-utils';
import type { PostValidateRequestBody } from '@kbn/discoveries-schemas';
import {
  generateAttackDiscoveryAlertHash,
  transformToAlertDocuments,
} from './transform_to_alert_documents';
import {
  ALERT_ATTACK_DISCOVERY_ENTITY_SUMMARY_MARKDOWN_WITH_REPLACEMENTS,
  ALERT_ATTACK_DISCOVERY_GENERATION_SOURCE,
  ALERT_ATTACK_DISCOVERY_REPLACEMENTS,
} from '@kbn/discoveries/impl/attack_discovery/alert_fields';

/**
 * An arbitrary producer identity. No production caller passes a
 * `generationSource` yet — this only exercises the opt-in mechanism.
 */
const TEST_GENERATION_SOURCE = 'test-producer';

describe('transformToAlertDocuments', () => {
  it('returns the risk score of only the anonymized alert matching the discovery alert_ids', () => {
    const authenticatedUser = {
      profile_uid: 'profile-1',
      username: 'user-1',
    } as unknown as AuthenticatedUser;

    const validateRequestBody: PostValidateRequestBody = {
      alerts_context_count: 1,
      anonymized_alerts: [
        { metadata: {}, page_content: '_id,a1\nkibana.alert.risk_score,10' },
        { metadata: {}, page_content: '_id,a2\nkibana.alert.risk_score,90' },
      ],
      api_config: { action_type_id: '.gen', connector_id: 'connector-1' },
      attack_discoveries: [
        {
          alert_ids: ['a1'],
          details_markdown: 'details',
          entity_summary_markdown: 'entity',
          mitre_attack_tactics: ['Execution'],
          summary_markdown: 'summary',
          timestamp: '2025-12-15T18:39:20.762Z',
          title: 'title',
        },
      ],
      connector_name: 'Connector 1',
      enable_field_rendering: true,
      generation_uuid: 'generation-1',
      with_replacements: false,
    };

    const [doc] = transformToAlertDocuments({
      authenticatedUser,
      now: new Date('2025-12-15T18:39:20.762Z'),
      validateRequestBody,
      spaceId: 'default',
    });

    expect(doc[ALERT_RISK_SCORE]).toBe(10);
  });

  it('returns the sum of risk scores of all anonymized alerts matching the discovery alert_ids', () => {
    const authenticatedUser = {
      profile_uid: 'profile-1',
      username: 'user-1',
    } as unknown as AuthenticatedUser;

    const validateRequestBody: PostValidateRequestBody = {
      alerts_context_count: 1,
      anonymized_alerts: [
        { metadata: {}, page_content: '_id,a1\nkibana.alert.risk_score,10' },
        { metadata: {}, page_content: '_id,a2\nkibana.alert.risk_score,20' },
        { metadata: {}, page_content: '_id,a3\nkibana.alert.risk_score,90' },
      ],
      api_config: { action_type_id: '.gen', connector_id: 'connector-1' },
      attack_discoveries: [
        {
          alert_ids: ['a1', 'a2'],
          details_markdown: 'details',
          entity_summary_markdown: 'entity',
          mitre_attack_tactics: ['Execution'],
          summary_markdown: 'summary',
          timestamp: '2025-12-15T18:39:20.762Z',
          title: 'title',
        },
      ],
      connector_name: 'Connector 1',
      enable_field_rendering: true,
      generation_uuid: 'generation-1',
      with_replacements: false,
    };

    const [doc] = transformToAlertDocuments({
      authenticatedUser,
      now: new Date('2025-12-15T18:39:20.762Z'),
      validateRequestBody,
      spaceId: 'default',
    });

    expect(doc[ALERT_RISK_SCORE]).toBe(30);
  });

  it('returns an undefined risk score when no anonymized alert matches the discovery alert_ids', () => {
    const authenticatedUser = {
      profile_uid: 'profile-1',
      username: 'user-1',
    } as unknown as AuthenticatedUser;

    const validateRequestBody: PostValidateRequestBody = {
      alerts_context_count: 1,
      anonymized_alerts: [{ metadata: {}, page_content: '_id,a2\nkibana.alert.risk_score,42' }],
      api_config: { action_type_id: '.gen', connector_id: 'connector-1' },
      attack_discoveries: [
        {
          alert_ids: ['a1'],
          details_markdown: 'details',
          entity_summary_markdown: 'entity',
          mitre_attack_tactics: ['Execution'],
          summary_markdown: 'summary',
          timestamp: '2025-12-15T18:39:20.762Z',
          title: 'title',
        },
      ],
      connector_name: 'Connector 1',
      enable_field_rendering: true,
      generation_uuid: 'generation-1',
      with_replacements: false,
    };

    const [doc] = transformToAlertDocuments({
      authenticatedUser,
      now: new Date('2025-12-15T18:39:20.762Z'),
      validateRequestBody,
      spaceId: 'default',
    });

    expect(doc[ALERT_RISK_SCORE]).toBeUndefined();
  });

  it('returns an undefined risk score when the matching anonymized alert has no risk score value', () => {
    const authenticatedUser = {
      profile_uid: 'profile-1',
      username: 'user-1',
    } as unknown as AuthenticatedUser;

    const validateRequestBody: PostValidateRequestBody = {
      alerts_context_count: 1,
      anonymized_alerts: [{ metadata: {}, page_content: '_id,a1\nhost.name,test-host' }],
      api_config: { action_type_id: '.gen', connector_id: 'connector-1' },
      attack_discoveries: [
        {
          alert_ids: ['a1'],
          details_markdown: 'details',
          entity_summary_markdown: 'entity',
          mitre_attack_tactics: ['Execution'],
          summary_markdown: 'summary',
          timestamp: '2025-12-15T18:39:20.762Z',
          title: 'title',
        },
      ],
      connector_name: 'Connector 1',
      enable_field_rendering: true,
      generation_uuid: 'generation-1',
      with_replacements: false,
    };

    const [doc] = transformToAlertDocuments({
      authenticatedUser,
      now: new Date('2025-12-15T18:39:20.762Z'),
      validateRequestBody,
      spaceId: 'default',
    });

    expect(doc[ALERT_RISK_SCORE]).toBeUndefined();
  });

  it('returns the replacements array when replacements are provided', () => {
    const authenticatedUser = {
      profile_uid: 'profile-1',
      username: 'user-1',
    } as unknown as AuthenticatedUser;

    const validateRequestBody: PostValidateRequestBody = {
      alerts_context_count: 1,
      anonymized_alerts: [{ metadata: {}, page_content: 'kibana.alert.risk_score,13' }],
      api_config: { action_type_id: '.gen', connector_id: 'connector-1' },
      attack_discoveries: [
        {
          alert_ids: ['a1'],
          details_markdown: 'details',
          entity_summary_markdown: 'entity',
          mitre_attack_tactics: ['Execution'],
          summary_markdown: 'summary',
          timestamp: '2025-12-15T18:39:20.762Z',
          title: 'title',
        },
      ],
      connector_name: 'Connector 1',
      enable_field_rendering: true,
      generation_uuid: 'generation-1',
      replacements: { foo: 'bar' },
      with_replacements: false,
    };

    const [doc] = transformToAlertDocuments({
      authenticatedUser,
      now: new Date('2025-12-15T18:39:20.762Z'),
      validateRequestBody,
      spaceId: 'default',
    });

    expect(doc[ALERT_ATTACK_DISCOVERY_REPLACEMENTS]).toEqual([{ uuid: 'foo', value: 'bar' }]);
  });

  it('returns undefined replacements when replacements are an empty object', () => {
    const authenticatedUser = {
      profile_uid: 'profile-1',
      username: 'user-1',
    } as unknown as AuthenticatedUser;

    const validateRequestBody: PostValidateRequestBody = {
      alerts_context_count: 1,
      anonymized_alerts: [{ metadata: {}, page_content: 'kibana.alert.risk_score,13' }],
      api_config: { action_type_id: '.gen', connector_id: 'connector-1' },
      attack_discoveries: [
        {
          alert_ids: ['a1'],
          details_markdown: 'details',
          entity_summary_markdown: 'entity',
          mitre_attack_tactics: ['Execution'],
          summary_markdown: 'summary',
          timestamp: '2025-12-15T18:39:20.762Z',
          title: 'title',
        },
      ],
      connector_name: 'Connector 1',
      enable_field_rendering: true,
      generation_uuid: 'generation-1',
      replacements: {},
      with_replacements: false,
    };

    const [doc] = transformToAlertDocuments({
      authenticatedUser,
      now: new Date('2025-12-15T18:39:20.762Z'),
      validateRequestBody,
      spaceId: 'default',
    });

    expect(doc[ALERT_ATTACK_DISCOVERY_REPLACEMENTS]).toBeUndefined();
  });

  it('returns undefined for entity_summary_markdown_with_replacements when entity summary is not provided', () => {
    const authenticatedUser = {
      profile_uid: 'profile-1',
      username: 'user-1',
    } as unknown as AuthenticatedUser;

    const validateRequestBody: PostValidateRequestBody = {
      alerts_context_count: 1,
      anonymized_alerts: [{ metadata: {}, page_content: 'kibana.alert.risk_score,13' }],
      api_config: { action_type_id: '.gen', connector_id: 'connector-1' },
      attack_discoveries: [
        {
          alert_ids: ['a1'],
          details_markdown: 'details',
          entity_summary_markdown: undefined,
          mitre_attack_tactics: ['Execution'],
          summary_markdown: 'summary',
          timestamp: '2025-12-15T18:39:20.762Z',
          title: 'title',
        },
      ],
      connector_name: 'Connector 1',
      enable_field_rendering: true,
      generation_uuid: 'generation-1',
      with_replacements: false,
    };

    const [doc] = transformToAlertDocuments({
      authenticatedUser,
      now: new Date('2025-12-15T18:39:20.762Z'),
      validateRequestBody,
      spaceId: 'default',
    });

    expect(doc[ALERT_ATTACK_DISCOVERY_ENTITY_SUMMARY_MARKDOWN_WITH_REPLACEMENTS]).toBeUndefined();
  });

  it('uses profile_uid as owner id when username is missing', () => {
    const authenticatedUser = {
      profile_uid: 'profile-1',
    } as unknown as AuthenticatedUser;

    const validateRequestBody: PostValidateRequestBody = {
      alerts_context_count: 1,
      anonymized_alerts: [{ metadata: {}, page_content: 'kibana.alert.risk_score,13' }],
      api_config: { action_type_id: '.gen', connector_id: 'connector-1' },
      attack_discoveries: [
        {
          alert_ids: ['a1'],
          details_markdown: 'details',
          entity_summary_markdown: 'entity',
          mitre_attack_tactics: ['Execution'],
          summary_markdown: 'summary',
          timestamp: '2025-12-15T18:39:20.762Z',
          title: 'title',
        },
      ],
      connector_name: 'Connector 1',
      enable_field_rendering: true,
      generation_uuid: 'generation-1',
      with_replacements: false,
    };

    const [doc] = transformToAlertDocuments({
      authenticatedUser,
      now: new Date('2025-12-15T18:39:20.762Z'),
      validateRequestBody,
      spaceId: 'default',
    });

    expect(doc[ALERT_UUID]).toBe(
      generateAttackDiscoveryAlertHash({
        alertIds: ['a1'],
        attackDiscoveryId: undefined,
        connectorId: 'connector-1',
        ownerId: 'profile-1',
        replacements: undefined,
        spaceId: 'default',
      })
    );
  });

  describe('generation source', () => {
    const authenticatedUser = {
      profile_uid: 'profile-1',
      username: 'user-1',
    } as unknown as AuthenticatedUser;

    const validateRequestBody: PostValidateRequestBody = {
      alerts_context_count: 1,
      anonymized_alerts: [{ metadata: {}, page_content: '_id,a1\nkibana.alert.risk_score,10' }],
      api_config: { action_type_id: '.gen', connector_id: 'connector-1' },
      attack_discoveries: [
        {
          alert_ids: ['a1'],
          details_markdown: 'details',
          entity_summary_markdown: 'entity',
          mitre_attack_tactics: ['Execution'],
          summary_markdown: 'summary',
          timestamp: '2025-12-15T18:39:20.762Z',
          title: 'title',
        },
      ],
      connector_name: 'Connector 1',
      enable_field_rendering: true,
      generation_uuid: 'generation-1',
      with_replacements: false,
    };

    const transform = (generationSource?: string) =>
      transformToAlertDocuments({
        authenticatedUser,
        generationSource,
        now: new Date('2025-12-15T18:39:20.762Z'),
        validateRequestBody,
        spaceId: 'default',
      })[0];

    it(`does NOT set ${ALERT_ATTACK_DISCOVERY_GENERATION_SOURCE} when no generation source is provided`, () => {
      // the field must be absent, not undefined: `toEqual` ignores undefined
      // properties, so an absent key is what keeps existing documents unchanged
      expect(Object.keys(transform())).not.toContain(ALERT_ATTACK_DISCOVERY_GENERATION_SOURCE);
    });

    it(`sets ${ALERT_ATTACK_DISCOVERY_GENERATION_SOURCE} when a generation source is provided`, () => {
      expect(transform(TEST_GENERATION_SOURCE)[ALERT_ATTACK_DISCOVERY_GENERATION_SOURCE]).toBe(
        TEST_GENERATION_SOURCE
      );
    });

    it('contributes the generation source to the document id', () => {
      expect(transform(TEST_GENERATION_SOURCE)[ALERT_UUID]).toBe(
        generateAttackDiscoveryAlertHash({
          alertIds: ['a1'],
          attackDiscoveryId: undefined,
          connectorId: 'connector-1',
          generationSource: TEST_GENERATION_SOURCE,
          ownerId: 'user-1',
          replacements: undefined,
          spaceId: 'default',
        })
      );
    });

    it('does not collide with the document id of a producer that omits the generation source', () => {
      expect(transform(TEST_GENERATION_SOURCE)[ALERT_UUID]).not.toBe(transform()[ALERT_UUID]);
    });

    it('keeps the document id stable across runs of the same producer', () => {
      expect(transform(TEST_GENERATION_SOURCE)[ALERT_UUID]).toBe(
        transform(TEST_GENERATION_SOURCE)[ALERT_UUID]
      );
    });

    it('gives different producers different document ids', () => {
      expect(transform('producer-a')[ALERT_UUID]).not.toBe(transform('producer-b')[ALERT_UUID]);
    });
  });
});
