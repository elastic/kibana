/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { AuthenticatedUser } from '@kbn/core/server';
import { ALERT_RISK_SCORE, ALERT_UUID } from '@kbn/rule-data-utils';
import type { PostValidateRequestBody } from '@kbn/discoveries-schemas';
import { createHash } from 'crypto';
import {
  generateAttackDiscoveryAlertHash as generateSharedHash,
  WATCH_FLOOR_AD_WORKER_GENERATION_SOURCE,
} from '@kbn/attack-discovery-schedules-common';
import {
  generateAttackDiscoveryAlertHash,
  transformToAlertDocuments,
} from './transform_to_alert_documents';
import {
  ALERT_ATTACK_DISCOVERY_ENTITY_SUMMARY_MARKDOWN_WITH_REPLACEMENTS,
  ALERT_ATTACK_DISCOVERY_GENERATION_SOURCE,
  ALERT_ATTACK_DISCOVERY_REPLACEMENTS,
} from '@kbn/discoveries/impl/attack_discovery/alert_fields';

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

  it('omits generation_source when the request body has none', () => {
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
      with_replacements: false,
    };

    const [doc] = transformToAlertDocuments({
      authenticatedUser,
      now: new Date('2025-12-15T18:39:20.762Z'),
      validateRequestBody,
      spaceId: 'default',
    });

    expect(
      Object.prototype.hasOwnProperty.call(doc, ALERT_ATTACK_DISCOVERY_GENERATION_SOURCE)
    ).toBe(false);
  });

  it('writes generation_source when the request body supplies it', () => {
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
      generation_source: WATCH_FLOOR_AD_WORKER_GENERATION_SOURCE,
      generation_uuid: 'generation-1',
      with_replacements: false,
    };

    const [doc] = transformToAlertDocuments({
      authenticatedUser,
      now: new Date('2025-12-15T18:39:20.762Z'),
      validateRequestBody,
      spaceId: 'default',
    });

    expect(doc[ALERT_ATTACK_DISCOVERY_GENERATION_SOURCE]).toBe(
      WATCH_FLOOR_AD_WORKER_GENERATION_SOURCE
    );
  });
});

describe('generateAttackDiscoveryAlertHash', () => {
  const computeSha256Hash = (input: string): string =>
    createHash('sha256').update(input).digest('hex');

  const sharedAttackDiscovery = {
    alertIds: ['alert-b', 'alert-a'],
    detailsMarkdown: 'details',
    summaryMarkdown: 'summary',
    timestamp: '2025-12-15T18:39:20.762Z',
    title: 'title',
  };

  it('matches the shared implementation for non-empty alert IDs without a generation source', () => {
    const shared = generateSharedHash({
      attackDiscovery: sharedAttackDiscovery,
      computeSha256Hash,
      connectorId: 'connector-1',
      ownerId: 'owner-1',
      replacements: undefined,
      spaceId: 'space-1',
    });
    const forked = generateAttackDiscoveryAlertHash({
      alertIds: ['alert-b', 'alert-a'],
      attackDiscoveryId: undefined,
      connectorId: 'connector-1',
      ownerId: 'owner-1',
      replacements: undefined,
      spaceId: 'space-1',
    });

    expect(forked).toBe(shared);
  });

  it('matches the shared implementation for non-empty alert IDs with a generation source', () => {
    const shared = generateSharedHash({
      attackDiscovery: sharedAttackDiscovery,
      computeSha256Hash,
      connectorId: 'connector-1',
      generationSource: WATCH_FLOOR_AD_WORKER_GENERATION_SOURCE,
      ownerId: 'owner-1',
      replacements: undefined,
      spaceId: 'space-1',
    });
    const forked = generateAttackDiscoveryAlertHash({
      alertIds: ['alert-b', 'alert-a'],
      attackDiscoveryId: undefined,
      connectorId: 'connector-1',
      generationSource: WATCH_FLOOR_AD_WORKER_GENERATION_SOURCE,
      ownerId: 'owner-1',
      replacements: undefined,
      spaceId: 'space-1',
    });

    expect(forked).toBe(shared);
  });

  it('falls back to the discovery id when alertIds is empty', () => {
    const result = generateAttackDiscoveryAlertHash({
      alertIds: [],
      attackDiscoveryId: 'disc-id',
      connectorId: 'connector-1',
      ownerId: 'owner-1',
      replacements: undefined,
      spaceId: 'space-1',
    });

    expect(result).toBe('a547dfc76e2dcc25b9d9979a0b67a8d18115fd077ca0b9b17033c7066fbeae1d');
  });

  it('falls back to the last-resort seed when alertIds and discovery id are empty', () => {
    const result = generateAttackDiscoveryAlertHash({
      alertIds: [],
      attackDiscoveryId: undefined,
      connectorId: 'connector-1',
      ownerId: 'owner-1',
      replacements: undefined,
      spaceId: 'space-1',
    });

    expect(result).toBe('930891309639946efff490d682889ea38e602379f941fa6afa1f9912b82bf677');
  });
});
