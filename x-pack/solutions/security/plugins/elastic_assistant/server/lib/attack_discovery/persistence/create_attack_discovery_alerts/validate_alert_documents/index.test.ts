/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ALERT_RULE_EXECUTION_UUID } from '@kbn/rule-data-utils';

import {
  ALERT_ATTACK_DISCOVERY_ALERT_IDS,
  ALERT_ATTACK_DISCOVERY_API_CONFIG,
  ALERT_ATTACK_DISCOVERY_DETAILS_MARKDOWN,
  ALERT_ATTACK_DISCOVERY_SUMMARY_MARKDOWN,
  ALERT_ATTACK_DISCOVERY_TITLE,
  type AttackDiscoveryAlertDocument,
} from '@kbn/attack-discovery-schedules-common';
import { validateAlertDocument, validateAlertDocuments } from '.';

describe('validateAlertDocument', () => {
  const createValidDocument = (): AttackDiscoveryAlertDocument =>
    ({
      '@timestamp': '2026-01-12T19:00:00.000Z',
      [ALERT_ATTACK_DISCOVERY_ALERT_IDS]: ['alert-1', 'alert-2'],
      [ALERT_ATTACK_DISCOVERY_API_CONFIG]: {
        action_type_id: '.gen-ai',
        connector_id: 'test-connector',
        name: 'Test Connector',
      },
      [ALERT_ATTACK_DISCOVERY_DETAILS_MARKDOWN]: 'Details markdown',
      [ALERT_RULE_EXECUTION_UUID]: 'generation-uuid-123',
      [ALERT_ATTACK_DISCOVERY_SUMMARY_MARKDOWN]: 'Summary markdown',
      [ALERT_ATTACK_DISCOVERY_TITLE]: 'Test Attack Discovery',
    } as unknown as AttackDiscoveryAlertDocument);

  const createDocumentWithoutTimestamp = (): AttackDiscoveryAlertDocument => {
    const { '@timestamp': _removed, ...document } = createValidDocument();
    return document as AttackDiscoveryAlertDocument;
  };

  const createDocumentWithoutApiConfig = (): AttackDiscoveryAlertDocument => {
    const { [ALERT_ATTACK_DISCOVERY_API_CONFIG]: _removed, ...document } = createValidDocument();
    return document as AttackDiscoveryAlertDocument;
  };

  const createDocumentWithoutActionTypeId = (): AttackDiscoveryAlertDocument => {
    const doc = createValidDocument();
    const { action_type_id: _removed, ...apiConfig } = doc[ALERT_ATTACK_DISCOVERY_API_CONFIG];
    return {
      ...doc,
      [ALERT_ATTACK_DISCOVERY_API_CONFIG]: apiConfig,
    } as AttackDiscoveryAlertDocument;
  };

  const createDocumentWithoutConnectorId = (): AttackDiscoveryAlertDocument => {
    const doc = createValidDocument();
    const { connector_id: _removed, ...apiConfig } = doc[ALERT_ATTACK_DISCOVERY_API_CONFIG];
    return {
      ...doc,
      [ALERT_ATTACK_DISCOVERY_API_CONFIG]: apiConfig,
    } as AttackDiscoveryAlertDocument;
  };

  const createDocumentWithoutConnectorName = (): AttackDiscoveryAlertDocument => {
    const doc = createValidDocument();
    const { name: _removed, ...apiConfig } = doc[ALERT_ATTACK_DISCOVERY_API_CONFIG];
    return {
      ...doc,
      [ALERT_ATTACK_DISCOVERY_API_CONFIG]: apiConfig,
    } as AttackDiscoveryAlertDocument;
  };

  const createDocumentWithoutDetailsMarkdown = (): AttackDiscoveryAlertDocument => {
    const { [ALERT_ATTACK_DISCOVERY_DETAILS_MARKDOWN]: _removed, ...document } =
      createValidDocument();
    return document as AttackDiscoveryAlertDocument;
  };

  const createDocumentWithoutExecutionUuid = (): AttackDiscoveryAlertDocument => {
    const { [ALERT_RULE_EXECUTION_UUID]: _removed, ...document } = createValidDocument();
    return document as AttackDiscoveryAlertDocument;
  };

  const createDocumentWithoutSummaryMarkdown = (): AttackDiscoveryAlertDocument => {
    const { [ALERT_ATTACK_DISCOVERY_SUMMARY_MARKDOWN]: _removed, ...document } =
      createValidDocument();
    return document as AttackDiscoveryAlertDocument;
  };

  const createDocumentWithoutTitle = (): AttackDiscoveryAlertDocument => {
    const { [ALERT_ATTACK_DISCOVERY_TITLE]: _removed, ...document } = createValidDocument();
    return document as AttackDiscoveryAlertDocument;
  };

  const createDocumentWithInvalidAlertIds = (): AttackDiscoveryAlertDocument => {
    return {
      ...createValidDocument(),
      [ALERT_ATTACK_DISCOVERY_ALERT_IDS]: 'not-an-array' as unknown,
    } as AttackDiscoveryAlertDocument;
  };

  it('returns isValid true for a valid document', () => {
    const document = createValidDocument();

    const result = validateAlertDocument(document);

    expect(result.isValid).toBe(true);
  });

  it('returns empty missing fields for a valid document', () => {
    const document = createValidDocument();

    const result = validateAlertDocument(document);

    expect(result.missingFields).toEqual([]);
  });

  it('returns isValid false when @timestamp is missing', () => {
    const document = createDocumentWithoutTimestamp();

    const result = validateAlertDocument(document);

    expect(result.isValid).toBe(false);
  });

  it('includes @timestamp in missing fields when not present', () => {
    const document = createDocumentWithoutTimestamp();

    const result = validateAlertDocument(document);

    expect(result.missingFields).toContain('@timestamp');
  });

  it('returns isValid false when alert_ids is not an array', () => {
    const document = createDocumentWithInvalidAlertIds();

    const result = validateAlertDocument(document);

    expect(result.isValid).toBe(false);
  });

  it('includes alert_ids in missing fields when not an array', () => {
    const document = createDocumentWithInvalidAlertIds();

    const result = validateAlertDocument(document);

    expect(result.missingFields).toContain(`${ALERT_ATTACK_DISCOVERY_ALERT_IDS} (not an array)`);
  });

  it('returns isValid false when api_config is missing', () => {
    const document = createDocumentWithoutApiConfig();

    const result = validateAlertDocument(document);

    expect(result.isValid).toBe(false);
  });

  it('includes api_config in missing fields when not present', () => {
    const document = createDocumentWithoutApiConfig();

    const result = validateAlertDocument(document);

    expect(result.missingFields).toContain(ALERT_ATTACK_DISCOVERY_API_CONFIG);
  });

  it('returns isValid false when action_type_id is missing', () => {
    const document = createDocumentWithoutActionTypeId();

    const result = validateAlertDocument(document);

    expect(result.isValid).toBe(false);
  });

  it('includes action_type_id in missing fields when not present', () => {
    const document = createDocumentWithoutActionTypeId();

    const result = validateAlertDocument(document);

    expect(result.missingFields).toContain(`${ALERT_ATTACK_DISCOVERY_API_CONFIG}.action_type_id`);
  });

  it('returns isValid false when connector_id is missing', () => {
    const document = createDocumentWithoutConnectorId();

    const result = validateAlertDocument(document);

    expect(result.isValid).toBe(false);
  });

  it('includes connector_id in missing fields when not present', () => {
    const document = createDocumentWithoutConnectorId();

    const result = validateAlertDocument(document);

    expect(result.missingFields).toContain(`${ALERT_ATTACK_DISCOVERY_API_CONFIG}.connector_id`);
  });

  it('returns isValid false when connector name is missing', () => {
    const document = createDocumentWithoutConnectorName();

    const result = validateAlertDocument(document);

    expect(result.isValid).toBe(false);
  });

  it('includes connector name in missing fields when not present', () => {
    const document = createDocumentWithoutConnectorName();

    const result = validateAlertDocument(document);

    expect(result.missingFields).toContain(`${ALERT_ATTACK_DISCOVERY_API_CONFIG}.name`);
  });

  it('returns isValid false when details_markdown is missing', () => {
    const document = createDocumentWithoutDetailsMarkdown();

    const result = validateAlertDocument(document);

    expect(result.isValid).toBe(false);
  });

  it('includes details_markdown in missing fields when not present', () => {
    const document = createDocumentWithoutDetailsMarkdown();

    const result = validateAlertDocument(document);

    expect(result.missingFields).toContain(ALERT_ATTACK_DISCOVERY_DETAILS_MARKDOWN);
  });

  it('returns isValid false when execution UUID is missing', () => {
    const document = createDocumentWithoutExecutionUuid();

    const result = validateAlertDocument(document);

    expect(result.isValid).toBe(false);
  });

  it('includes execution UUID in missing fields when not present', () => {
    const document = createDocumentWithoutExecutionUuid();

    const result = validateAlertDocument(document);

    expect(result.missingFields).toContain(ALERT_RULE_EXECUTION_UUID);
  });

  it('returns isValid false when summary_markdown is missing', () => {
    const document = createDocumentWithoutSummaryMarkdown();

    const result = validateAlertDocument(document);

    expect(result.isValid).toBe(false);
  });

  it('includes summary_markdown in missing fields when not present', () => {
    const document = createDocumentWithoutSummaryMarkdown();

    const result = validateAlertDocument(document);

    expect(result.missingFields).toContain(ALERT_ATTACK_DISCOVERY_SUMMARY_MARKDOWN);
  });

  it('returns isValid false when title is missing', () => {
    const document = createDocumentWithoutTitle();

    const result = validateAlertDocument(document);

    expect(result.isValid).toBe(false);
  });

  it('includes title in missing fields when not present', () => {
    const document = createDocumentWithoutTitle();

    const result = validateAlertDocument(document);

    expect(result.missingFields).toContain(ALERT_ATTACK_DISCOVERY_TITLE);
  });
});

describe('validateAlertDocuments', () => {
  const createValidDocument = (): AttackDiscoveryAlertDocument =>
    ({
      '@timestamp': '2026-01-12T19:00:00.000Z',
      [ALERT_ATTACK_DISCOVERY_ALERT_IDS]: ['alert-1', 'alert-2'],
      [ALERT_ATTACK_DISCOVERY_API_CONFIG]: {
        action_type_id: '.gen-ai',
        connector_id: 'test-connector',
        name: 'Test Connector',
      },
      [ALERT_ATTACK_DISCOVERY_DETAILS_MARKDOWN]: 'Details markdown',
      [ALERT_RULE_EXECUTION_UUID]: 'generation-uuid-123',
      [ALERT_ATTACK_DISCOVERY_SUMMARY_MARKDOWN]: 'Summary markdown',
      [ALERT_ATTACK_DISCOVERY_TITLE]: 'Test Attack Discovery',
    } as unknown as AttackDiscoveryAlertDocument);

  const createDocumentWithoutTimestamp = (): AttackDiscoveryAlertDocument => {
    const { '@timestamp': _removed, ...document } = createValidDocument();
    return document as AttackDiscoveryAlertDocument;
  };

  it('returns isValid true when all documents are valid', () => {
    const documents = [createValidDocument(), createValidDocument()];

    const result = validateAlertDocuments(documents);

    expect(result.isValid).toBe(true);
  });

  it('returns empty errors when all documents are valid', () => {
    const documents = [createValidDocument(), createValidDocument()];

    const result = validateAlertDocuments(documents);

    expect(result.errors).toEqual([]);
  });

  it('returns isValid false when a document is invalid', () => {
    const documents = [createValidDocument(), createDocumentWithoutTimestamp()];

    const result = validateAlertDocuments(documents);

    expect(result.isValid).toBe(false);
  });

  it('includes error details for invalid documents', () => {
    const documents = [createValidDocument(), createDocumentWithoutTimestamp()];

    const result = validateAlertDocuments(documents);

    expect(result.errors.length).toBe(1);
  });

  it('identifies correct document ID in error', () => {
    const documents = [createValidDocument(), createDocumentWithoutTimestamp()];

    const result = validateAlertDocuments(documents);

    expect(result.errors[0].documentId).toBe('generation-uuid-123');
  });

  it('identifies missing fields in error', () => {
    const documents = [createValidDocument(), createDocumentWithoutTimestamp()];

    const result = validateAlertDocuments(documents);

    expect(result.errors[0].missingFields).toContain('@timestamp');
  });
});
