/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  ALERT_RULE_EXECUTION_UUID,
  ALERT_RULE_UUID,
  ALERT_START,
  ALERT_UPDATED_AT,
  ALERT_WORKFLOW_STATUS,
  ALERT_WORKFLOW_STATUS_UPDATED_AT,
} from '@kbn/rule-data-utils';
import { transformAttackDiscoveryAlertDocumentToApi } from './transform_attack_discovery_alert_document_to_api';

describe('transformAttackDiscoveryAlertDocumentToApi', () => {
  const baseDoc = {
    [ALERT_RULE_EXECUTION_UUID]: 'generation-1',
    [ALERT_RULE_UUID]: 'rule-1',
    [ALERT_START]: '2025-12-15T18:39:20.762Z',
    [ALERT_UPDATED_AT]: '2025-12-15T18:39:20.833Z',
    [ALERT_WORKFLOW_STATUS]: 'open',
    [ALERT_WORKFLOW_STATUS_UPDATED_AT]: '2025-12-15T18:39:20.833Z',
    'kibana.alert.attack_discovery.alert_ids': ['a1'],
    'kibana.alert.attack_discovery.api_config': {
      connector_id: 'connector-1',
      name: 'Connector 1',
    },
    'kibana.alert.attack_discovery.details_markdown': 'Hello {{ host.name SRVWIN04}}',
    'kibana.alert.attack_discovery.details_markdown_with_replacements': 'Hello SRVWIN04',
    'kibana.alert.attack_discovery.summary_markdown': 'summary',
    'kibana.alert.attack_discovery.summary_markdown_with_replacements': 'summary',
    'kibana.alert.attack_discovery.title': 'title',
    'kibana.alert.attack_discovery.title_with_replacements': 'title',
  } as const;

  it('returns rendered details_markdown when enableFieldRendering is false', () => {
    const result = transformAttackDiscoveryAlertDocumentToApi({
      attackDiscoveryAlertDocument: baseDoc,
      enableFieldRendering: false,
      id: 'id-1',
      withReplacements: false,
    });

    expect(result.details_markdown).toBe('Hello SRVWIN04');
  });

  it('returns replacement markdown when withReplacements is true', () => {
    const result = transformAttackDiscoveryAlertDocumentToApi({
      attackDiscoveryAlertDocument: baseDoc,
      enableFieldRendering: true,
      id: 'id-1',
      withReplacements: true,
    });

    expect(result.details_markdown).toBe('Hello SRVWIN04');
  });

  it('returns unrendered markdown when enableFieldRendering is true', () => {
    const result = transformAttackDiscoveryAlertDocumentToApi({
      attackDiscoveryAlertDocument: baseDoc,
      enableFieldRendering: true,
      id: 'id-1',
      withReplacements: false,
    });

    expect(result.details_markdown).toBe('Hello {{ host.name SRVWIN04}}');
  });

  it('returns an empty string when the details markdown field is missing', () => {
    const { ['kibana.alert.attack_discovery.details_markdown']: _ignored, ...docWithoutDetails } =
      baseDoc;

    const result = transformAttackDiscoveryAlertDocumentToApi({
      attackDiscoveryAlertDocument: docWithoutDetails,
      enableFieldRendering: true,
      id: 'id-1',
      withReplacements: false,
    });

    expect(result.details_markdown).toBe('');
  });

  it('returns undefined for alert_start when the date is invalid', () => {
    const result = transformAttackDiscoveryAlertDocumentToApi({
      attackDiscoveryAlertDocument: { ...baseDoc, [ALERT_START]: '2025-99-99T00:00:00.000Z' },
      enableFieldRendering: true,
      id: 'id-1',
      withReplacements: false,
    });

    expect(result.alert_start).toBeUndefined();
  });

  beforeAll(() => {
    jest.useFakeTimers();
  });

  afterAll(() => {
    jest.useRealTimers();
  });

  it('returns the current time for timestamp when alert start is missing', () => {
    jest.setSystemTime(new Date('2025-12-15T00:00:00.000Z'));

    const { [ALERT_START]: _ignored, ...docWithoutStart } = baseDoc;
    const result = transformAttackDiscoveryAlertDocumentToApi({
      attackDiscoveryAlertDocument: docWithoutStart,
      enableFieldRendering: true,
      id: 'id-1',
      withReplacements: false,
    });

    expect(result.timestamp).toBe('2025-12-15T00:00:00.000Z');
  });

  it('returns undefined for alert_updated_at when the date is invalid', () => {
    const result = transformAttackDiscoveryAlertDocumentToApi({
      attackDiscoveryAlertDocument: { ...baseDoc, [ALERT_UPDATED_AT]: '2025-99-99T00:00:00.000Z' },
      enableFieldRendering: true,
      id: 'id-1',
      withReplacements: false,
    });

    expect(result.alert_updated_at).toBeUndefined();
  });

  it('returns undefined for alert_workflow_status_updated_at when the date is invalid', () => {
    const result = transformAttackDiscoveryAlertDocumentToApi({
      attackDiscoveryAlertDocument: {
        ...baseDoc,
        [ALERT_WORKFLOW_STATUS_UPDATED_AT]: '2025-99-99T00:00:00.000Z',
      },
      enableFieldRendering: true,
      id: 'id-1',
      withReplacements: false,
    });

    expect(result.alert_workflow_status_updated_at).toBeUndefined();
  });

  it('returns an empty string for connector_id when api_config is missing', () => {
    const result = transformAttackDiscoveryAlertDocumentToApi({
      attackDiscoveryAlertDocument: {
        ...baseDoc,
        'kibana.alert.attack_discovery.api_config': {},
      },
      enableFieldRendering: true,
      id: 'id-1',
      withReplacements: false,
    });

    expect(result.connector_id).toBe('');
  });

  it('returns an empty string for generation_uuid when it is missing', () => {
    const { [ALERT_RULE_EXECUTION_UUID]: _ignored, ...docWithoutExecutionUuid } = baseDoc;

    const result = transformAttackDiscoveryAlertDocumentToApi({
      attackDiscoveryAlertDocument: docWithoutExecutionUuid,
      enableFieldRendering: true,
      id: 'id-1',
      withReplacements: false,
    });

    expect(result.generation_uuid).toBe('');
  });

  it('returns an empty array for alert_ids when they are missing', () => {
    const { ['kibana.alert.attack_discovery.alert_ids']: _ignored, ...docWithoutAlertIds } =
      baseDoc;

    const result = transformAttackDiscoveryAlertDocumentToApi({
      attackDiscoveryAlertDocument: docWithoutAlertIds,
      enableFieldRendering: true,
      id: 'id-1',
      withReplacements: false,
    });

    expect(result.alert_ids).toEqual([]);
  });

  it('uses the normal markdown field when withReplacements is true but replacement field is not a string', () => {
    const result = transformAttackDiscoveryAlertDocumentToApi({
      attackDiscoveryAlertDocument: {
        ...baseDoc,
        'kibana.alert.attack_discovery.details_markdown_with_replacements': 123,
      },
      enableFieldRendering: false,
      id: 'id-1',
      withReplacements: true,
    });

    expect(result.details_markdown).toBe('Hello SRVWIN04');
  });

  it('returns replacements mapped to an object when replacements are present', () => {
    const result = transformAttackDiscoveryAlertDocumentToApi({
      attackDiscoveryAlertDocument: {
        ...baseDoc,
        'kibana.alert.attack_discovery.replacements': [{ uuid: 'u1', value: 'v1' }],
      },
      enableFieldRendering: true,
      id: 'id-1',
      withReplacements: false,
    });

    expect(result.replacements).toEqual({ u1: 'v1' });
  });

  it('returns undefined for replacements when replacements are missing', () => {
    const result = transformAttackDiscoveryAlertDocumentToApi({
      attackDiscoveryAlertDocument: baseDoc,
      enableFieldRendering: true,
      id: 'id-1',
      withReplacements: false,
    });

    expect(result.replacements).toBeUndefined();
  });
});
