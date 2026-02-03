/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { AttackDiscoveryApiAlert } from '@kbn/elastic-assistant-common';
import { getMarkdownFields } from '@kbn/elastic-assistant-common';
import type { AttackDiscoveryAlertDocument } from '../../../../schedules/types';
import { omit } from 'lodash/fp';

import {
  ALERT_RULE_EXECUTION_UUID,
  ALERT_RULE_UUID,
  ALERT_START,
  ALERT_UPDATED_AT,
  ALERT_UPDATED_BY_USER_ID,
  ALERT_UPDATED_BY_USER_NAME,
  ALERT_WORKFLOW_STATUS,
  ALERT_WORKFLOW_STATUS_UPDATED_AT,
} from '@kbn/rule-data-utils';

import {
  ALERT_ATTACK_DISCOVERY_ALERT_IDS,
  ALERT_ATTACK_DISCOVERY_API_CONFIG,
  ALERT_ATTACK_DISCOVERY_DETAILS_MARKDOWN,
  ALERT_ATTACK_DISCOVERY_DETAILS_MARKDOWN_WITH_REPLACEMENTS,
  ALERT_ATTACK_DISCOVERY_ENTITY_SUMMARY_MARKDOWN,
  ALERT_ATTACK_DISCOVERY_ENTITY_SUMMARY_MARKDOWN_WITH_REPLACEMENTS,
  ALERT_ATTACK_DISCOVERY_MITRE_ATTACK_TACTICS,
  ALERT_ATTACK_DISCOVERY_REPLACEMENTS,
  ALERT_ATTACK_DISCOVERY_SUMMARY_MARKDOWN,
  ALERT_ATTACK_DISCOVERY_SUMMARY_MARKDOWN_WITH_REPLACEMENTS,
  ALERT_ATTACK_DISCOVERY_TITLE,
  ALERT_ATTACK_DISCOVERY_TITLE_WITH_REPLACEMENTS,
  ALERT_ATTACK_DISCOVERY_USER_ID,
  ALERT_ATTACK_DISCOVERY_USER_NAME,
  ALERT_ATTACK_DISCOVERY_USERS,
  ALERT_RISK_SCORE,
} from '../../../../schedules/fields/field_names';
import { transformAttackDiscoveryAlertDocumentToApi } from '.';

describe('transformAttackDiscoveryAlertDocumentToApi', () => {
  const mockTimestamp = '2024-01-01T00:00:00.000Z';
  // Helper to create a complete, valid AttackDiscoveryAlertDocument fixture
  const createBaseDocument = (timestamp: string): AttackDiscoveryAlertDocument => ({
    '@timestamp': timestamp,
    // Attack discovery specific fields (use constants where available)
    [ALERT_ATTACK_DISCOVERY_ALERT_IDS]: ['alert-1', 'alert-2'],
    [ALERT_ATTACK_DISCOVERY_API_CONFIG]: {
      action_type_id: 'action-type-id',
      connector_id: 'connector-id',
      name: 'Test Connector',
    },
    [ALERT_ATTACK_DISCOVERY_DETAILS_MARKDOWN]: 'Attack details in markdown',
    [ALERT_ATTACK_DISCOVERY_DETAILS_MARKDOWN_WITH_REPLACEMENTS]:
      'Attack details in markdown with replacements',
    [ALERT_ATTACK_DISCOVERY_ENTITY_SUMMARY_MARKDOWN]: 'Entity summary markdown',
    [ALERT_ATTACK_DISCOVERY_ENTITY_SUMMARY_MARKDOWN_WITH_REPLACEMENTS]:
      'Entity summary markdown with replacements',
    [ALERT_ATTACK_DISCOVERY_MITRE_ATTACK_TACTICS]: ['TA0001', 'TA0002'],
    [ALERT_ATTACK_DISCOVERY_REPLACEMENTS]: [
      { value: 'replacement-value', uuid: 'replacement-uuid' },
    ],
    [ALERT_ATTACK_DISCOVERY_SUMMARY_MARKDOWN]: 'Summary markdown',
    [ALERT_ATTACK_DISCOVERY_SUMMARY_MARKDOWN_WITH_REPLACEMENTS]:
      'Summary markdown with replacements',
    [ALERT_ATTACK_DISCOVERY_TITLE]: 'Attack Discovery Title',
    [ALERT_ATTACK_DISCOVERY_TITLE_WITH_REPLACEMENTS]: 'Attack Discovery Title with replacements',
    [ALERT_ATTACK_DISCOVERY_USER_ID]: 'user-123',
    [ALERT_ATTACK_DISCOVERY_USER_NAME]: 'Test User',
    [ALERT_ATTACK_DISCOVERY_USERS]: [
      { id: 'user-1', name: 'User One' },
      { id: 'user-2', name: 'User Two' },
    ],
    [ALERT_RISK_SCORE]: 85,
    // Required context count field
    'kibana.alert.attack_discovery.alerts_context_count': 2,
    // Alert rule execution / timing fields
    [ALERT_RULE_EXECUTION_UUID]: 'execution-uuid',
    [ALERT_RULE_UUID]: 'rule-uuid',
    // flattened required alert fields
    'kibana.alert.instance.id': 'instance-1',
    'kibana.alert.rule.category': 'category',
    'kibana.alert.rule.consumer': 'consumer',
    'kibana.alert.rule.name': 'rule-name',
    'kibana.alert.rule.producer': 'producer',
    'kibana.alert.rule.revision': 1,
    'kibana.alert.rule.rule_type_id': 'rule-type',
    // Only one 'kibana.alert.rule.uuid' property
    'kibana.alert.status': 'active',
    'kibana.alert.uuid': 'alert-uuid',
    'kibana.space_ids': [],
    [ALERT_START]: timestamp,
    [ALERT_UPDATED_AT]: timestamp,
    [ALERT_UPDATED_BY_USER_ID]: 'updater-user-id',
    [ALERT_UPDATED_BY_USER_NAME]: 'Updater User',
    [ALERT_WORKFLOW_STATUS]: 'open',
    [ALERT_WORKFLOW_STATUS_UPDATED_AT]: timestamp,
    // Required by type
    'ecs.version': '8.0.0',
  });

  const id = 'test-id';
  let mockDocument: AttackDiscoveryAlertDocument;

  beforeEach(() => {
    mockDocument = createBaseDocument(mockTimestamp);
  });

  describe('withReplacements: false', () => {
    const testCases: Array<{
      description: string;
      fieldName: keyof AttackDiscoveryApiAlert;
      expectedValue: string | undefined;
    }> = [
      {
        description: 'should return details_markdown from the normal field',
        fieldName: 'details_markdown',
        expectedValue: 'Attack details in markdown',
      },
      {
        description: 'should return summary_markdown from the normal field',
        fieldName: 'summary_markdown',
        expectedValue: 'Summary markdown',
      },
      {
        description: 'should return title from the normal field',
        fieldName: 'title',
        expectedValue: 'Attack Discovery Title',
      },
      {
        description: 'should return entity_summary_markdown from the normal field',
        fieldName: 'entity_summary_markdown',
        expectedValue: 'Entity summary markdown',
      },
    ];

    testCases.forEach(({ description, fieldName, expectedValue }) => {
      it(description, () => {
        const result: AttackDiscoveryApiAlert = transformAttackDiscoveryAlertDocumentToApi({
          attackDiscoveryAlertDocument: mockDocument,
          enableFieldRendering: true,
          id,
          withReplacements: false,
        });

        expect(result[fieldName]).toEqual(expectedValue);
      });
    });

    it('should handle minimal document with required fields only', () => {
      // Minimal document: start from a valid base and override to the minimal required values
      const minimalDocument: AttackDiscoveryAlertDocument = {
        ...createBaseDocument(mockTimestamp),
        [ALERT_ATTACK_DISCOVERY_ALERT_IDS]: [],
        [ALERT_ATTACK_DISCOVERY_DETAILS_MARKDOWN]: '',
        [ALERT_ATTACK_DISCOVERY_SUMMARY_MARKDOWN]: '',
        [ALERT_ATTACK_DISCOVERY_TITLE]: '',
        [ALERT_RULE_EXECUTION_UUID]: 'execution-uuid',
      };

      const result: AttackDiscoveryApiAlert = transformAttackDiscoveryAlertDocumentToApi({
        attackDiscoveryAlertDocument: minimalDocument,
        enableFieldRendering: true,
        id,
        withReplacements: false,
      });

      expect(result.summary_markdown).toEqual('');
    });

    describe('should handle invalid dates gracefully', () => {
      let documentWithInvalidDates: AttackDiscoveryAlertDocument;
      let result: AttackDiscoveryApiAlert;

      beforeEach(() => {
        documentWithInvalidDates = {
          ...createBaseDocument('invalid-date'),
          '@timestamp': 'invalid-date',
          [ALERT_START]: 'invalid-date',
          [ALERT_UPDATED_AT]: 'another-invalid-date',
          [ALERT_WORKFLOW_STATUS_UPDATED_AT]: 'yet-another-invalid-date',
        };

        result = transformAttackDiscoveryAlertDocumentToApi({
          attackDiscoveryAlertDocument: documentWithInvalidDates,
          enableFieldRendering: true,
          id,
          withReplacements: false,
        });
      });

      it('should set alert_start to undefined for invalid dates', () => {
        expect(result.alert_start).toBeUndefined();
      });

      it('should set alert_updated_at to undefined for invalid dates', () => {
        expect(result.alert_updated_at).toBeUndefined();
      });

      it('should set alert_workflow_status_updated_at to undefined for invalid dates', () => {
        expect(result.alert_workflow_status_updated_at).toBeUndefined();
      });

      it('should provide a valid timestamp fallback for invalid @timestamp', () => {
        expect(Date.parse(result.timestamp)).not.toBeNaN();
      });
    });

    it('should transform a full document to API format', () => {
      const result: AttackDiscoveryApiAlert = transformAttackDiscoveryAlertDocumentToApi({
        attackDiscoveryAlertDocument: mockDocument,
        enableFieldRendering: true,
        id,
        withReplacements: false,
      });

      expect(result).toEqual({
        alert_ids: ['alert-1', 'alert-2'],
        alert_rule_uuid: 'rule-uuid',
        alert_start: '2024-01-01T00:00:00.000Z',
        alert_updated_at: '2024-01-01T00:00:00.000Z',
        alert_updated_by_user_id: 'updater-user-id',
        alert_updated_by_user_name: 'Updater User',
        alert_workflow_status: 'open',
        alert_workflow_status_updated_at: '2024-01-01T00:00:00.000Z',
        connector_id: 'connector-id',
        connector_name: 'Test Connector',
        details_markdown: 'Attack details in markdown',
        entity_summary_markdown: 'Entity summary markdown',
        generation_uuid: 'execution-uuid',
        id: 'test-id',
        mitre_attack_tactics: ['TA0001', 'TA0002'],
        replacements: { 'replacement-uuid': 'replacement-value' },
        risk_score: 85,
        summary_markdown: 'Summary markdown',
        timestamp: '2024-01-01T00:00:00.000Z',
        title: 'Attack Discovery Title',
        user_id: 'user-123',
        user_name: 'Test User',
        users: [
          { id: 'user-1', name: 'User One' },
          { id: 'user-2', name: 'User Two' },
        ],
      });
    });
  });

  describe('withReplacements: true', () => {
    beforeEach(() => {
      mockDocument = createBaseDocument(mockTimestamp);
    });

    const replacementTestCases: Array<{
      description: string;
      fieldName: keyof AttackDiscoveryApiAlert;
      expectedValue: string;
    }> = [
      {
        description: 'should prefer details_markdown_with_replacements when available',
        fieldName: 'details_markdown',
        expectedValue: 'Attack details in markdown with replacements',
      },
      {
        description: 'should prefer summary_markdown_with_replacements when available',
        fieldName: 'summary_markdown',
        expectedValue: 'Summary markdown with replacements',
      },
      {
        description: 'should prefer title_with_replacements when available',
        fieldName: 'title',
        expectedValue: 'Attack Discovery Title with replacements',
      },
      {
        description: 'should prefer entity_summary_markdown_with_replacements when available',
        fieldName: 'entity_summary_markdown',
        expectedValue: 'Entity summary markdown with replacements',
      },
    ];

    replacementTestCases.forEach(({ description, fieldName, expectedValue }) => {
      it(description, () => {
        const result: AttackDiscoveryApiAlert = transformAttackDiscoveryAlertDocumentToApi({
          attackDiscoveryAlertDocument: mockDocument,
          enableFieldRendering: true,
          id,
          withReplacements: true,
        });

        expect(result[fieldName]).toEqual(expectedValue);
      });
    });

    const fallbackTestCases: Array<{
      description: string;
      fieldToOmit: string;
      fieldName: keyof AttackDiscoveryApiAlert;
      expectedValue: string | undefined;
    }> = [
      {
        description:
          'should fall back to normal details_markdown when replacement field is missing',
        fieldToOmit: ALERT_ATTACK_DISCOVERY_DETAILS_MARKDOWN_WITH_REPLACEMENTS,
        fieldName: 'details_markdown',
        expectedValue: 'Attack details in markdown',
      },
      {
        description:
          'should fall back to normal summary_markdown when replacement field is missing',
        fieldToOmit: ALERT_ATTACK_DISCOVERY_SUMMARY_MARKDOWN_WITH_REPLACEMENTS,
        fieldName: 'summary_markdown',
        expectedValue: 'Summary markdown',
      },
      {
        description: 'should fall back to normal title when replacement field is missing',
        fieldToOmit: ALERT_ATTACK_DISCOVERY_TITLE_WITH_REPLACEMENTS,
        fieldName: 'title',
        expectedValue: 'Attack Discovery Title',
      },
      {
        description:
          'should fall back to normal entity_summary_markdown when replacement field is missing',
        fieldToOmit: ALERT_ATTACK_DISCOVERY_ENTITY_SUMMARY_MARKDOWN_WITH_REPLACEMENTS,
        fieldName: 'entity_summary_markdown',
        expectedValue: 'Entity summary markdown',
      },
    ];

    fallbackTestCases.forEach(({ description, fieldToOmit, fieldName, expectedValue }) => {
      it(description, () => {
        const docWithoutReplacement = omit(
          [fieldToOmit],
          mockDocument
        ) as AttackDiscoveryAlertDocument;

        const result: AttackDiscoveryApiAlert = transformAttackDiscoveryAlertDocumentToApi({
          attackDiscoveryAlertDocument: docWithoutReplacement,
          enableFieldRendering: true,
          id,
          withReplacements: true,
        });

        expect(result[fieldName]).toEqual(expectedValue);
      });
    });

    it('should transform a full document to API format with replacement fields', () => {
      const result: AttackDiscoveryApiAlert = transformAttackDiscoveryAlertDocumentToApi({
        attackDiscoveryAlertDocument: mockDocument,
        enableFieldRendering: true,
        id,
        withReplacements: true,
      });

      expect(result).toEqual({
        alert_ids: ['alert-1', 'alert-2'],
        alert_rule_uuid: 'rule-uuid',
        alert_start: '2024-01-01T00:00:00.000Z',
        alert_updated_at: '2024-01-01T00:00:00.000Z',
        alert_updated_by_user_id: 'updater-user-id',
        alert_updated_by_user_name: 'Updater User',
        alert_workflow_status: 'open',
        alert_workflow_status_updated_at: '2024-01-01T00:00:00.000Z',
        connector_id: 'connector-id',
        connector_name: 'Test Connector',
        details_markdown: 'Attack details in markdown with replacements',
        entity_summary_markdown: 'Entity summary markdown with replacements',
        generation_uuid: 'execution-uuid',
        id: 'test-id',
        mitre_attack_tactics: ['TA0001', 'TA0002'],
        replacements: { 'replacement-uuid': 'replacement-value' },
        risk_score: 85,
        summary_markdown: 'Summary markdown with replacements',
        timestamp: '2024-01-01T00:00:00.000Z',
        title: 'Attack Discovery Title with replacements',
        user_id: 'user-123',
        user_name: 'Test User',
        users: [
          { id: 'user-1', name: 'User One' },
          { id: 'user-2', name: 'User Two' },
        ],
      });
    });
  });

  describe('enableFieldRendering', () => {
    beforeEach(() => {
      mockDocument = createBaseDocument(mockTimestamp);
    });

    it('renders just the field values when enableFieldRendering is false', () => {
      // set a templated value to ensure it goes through the renderer
      mockDocument[ALERT_ATTACK_DISCOVERY_DETAILS_MARKDOWN] = '{{ user.name james }}';

      const result: AttackDiscoveryApiAlert = transformAttackDiscoveryAlertDocumentToApi({
        attackDiscoveryAlertDocument: mockDocument,
        enableFieldRendering: false,
        id,
        withReplacements: false,
      });

      expect(result.details_markdown).toEqual(getMarkdownFields('`james`'));
    });

    it('renders the field markdown syntax when withReplacements is true', () => {
      mockDocument[ALERT_ATTACK_DISCOVERY_DETAILS_MARKDOWN_WITH_REPLACEMENTS] =
        '{{ user.name james }}';

      const result: AttackDiscoveryApiAlert = transformAttackDiscoveryAlertDocumentToApi({
        attackDiscoveryAlertDocument: mockDocument,
        enableFieldRendering: true,
        id,
        withReplacements: true,
      });

      expect(result.details_markdown).toEqual(`{{ user.name james }}`);
    });
  });
});
