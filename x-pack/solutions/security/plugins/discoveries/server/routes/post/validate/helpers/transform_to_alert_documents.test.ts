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
  ALERT_ATTACK_DISCOVERY_REPLACEMENTS,
} from '@kbn/discoveries/impl/attack_discovery/alert_fields';

describe('transformToAlertDocuments', () => {
  it('returns the max extracted kibana.alert.risk_score from anonymized alerts', () => {
    const authenticatedUser = {
      profile_uid: 'profile-1',
      username: 'user-1',
    } as unknown as AuthenticatedUser;

    const validateRequestBody: PostValidateRequestBody = {
      alerts_context_count: 1,
      anonymized_alerts: [
        { metadata: {}, page_content: 'kibana.alert.risk_score,13' },
        { metadata: {}, page_content: 'kibana.alert.risk_score,42' },
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

    expect(doc[ALERT_RISK_SCORE]).toBe(42);
  });

  it('returns 0 risk score when anonymized alerts contain no risk score values', () => {
    const authenticatedUser = {
      profile_uid: 'profile-1',
      username: 'user-1',
    } as unknown as AuthenticatedUser;

    const validateRequestBody: PostValidateRequestBody = {
      alerts_context_count: 1,
      anonymized_alerts: [{ metadata: {}, page_content: 'no risk score here' }],
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

    expect(doc[ALERT_RISK_SCORE]).toBe(0);
  });

  it('returns 0 risk score when all extracted risk scores are NaN', () => {
    const authenticatedUser = {
      profile_uid: 'profile-1',
      username: 'user-1',
    } as unknown as AuthenticatedUser;

    const validateRequestBody: PostValidateRequestBody = {
      alerts_context_count: 1,
      anonymized_alerts: [{ metadata: {}, page_content: 'kibana.alert.risk_score,42' }],
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

    const originalParseInt = global.parseInt;
    global.parseInt = (() => Number.NaN) as unknown as typeof parseInt;

    const [doc] = transformToAlertDocuments({
      authenticatedUser,
      now: new Date('2025-12-15T18:39:20.762Z'),
      validateRequestBody,
      spaceId: 'default',
    });

    global.parseInt = originalParseInt;

    expect(doc[ALERT_RISK_SCORE]).toBe(0);
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
});
