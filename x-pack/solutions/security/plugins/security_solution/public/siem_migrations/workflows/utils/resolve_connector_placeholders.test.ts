/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  EMAIL_CONNECTOR_PLACEHOLDER,
  SLACK_CONNECTOR_PLACEHOLDER,
} from '../../../../common/siem_migrations/parsers/tines';
import {
  hasUnresolvedConnectorPlaceholders,
  resolveConnectorPlaceholders,
} from './resolve_connector_placeholders';

describe('resolveConnectorPlaceholders', () => {
  const yaml = `
steps:
  - name: notify_by_email
    type: email
    connector-id: ${EMAIL_CONNECTOR_PLACEHOLDER}
  - name: notify_slack
    type: slack
    connector-id: ${SLACK_CONNECTOR_PLACEHOLDER}
`.trim();

  it('replaces selected email and slack placeholders', () => {
    const resolved = resolveConnectorPlaceholders(yaml, {
      '.email': 'email-connector-1',
      '.slack': 'slack-connector-1',
    });

    expect(resolved).toContain('connector-id: email-connector-1');
    expect(resolved).toContain('connector-id: slack-connector-1');
    expect(resolved).not.toContain(EMAIL_CONNECTOR_PLACEHOLDER);
    expect(resolved).not.toContain(SLACK_CONNECTOR_PLACEHOLDER);
  });

  it('leaves unselected placeholders unchanged', () => {
    const resolved = resolveConnectorPlaceholders(yaml, {
      '.slack': 'slack-connector-1',
    });

    expect(resolved).toContain(EMAIL_CONNECTOR_PLACEHOLDER);
    expect(resolved).toContain('connector-id: slack-connector-1');
  });

  it('ignores empty selection values', () => {
    const resolved = resolveConnectorPlaceholders(yaml, {
      '.email': '',
      '.slack': undefined,
    });

    expect(resolved).toBe(yaml);
  });
});

describe('hasUnresolvedConnectorPlaceholders', () => {
  it('returns true when placeholders remain', () => {
    expect(hasUnresolvedConnectorPlaceholders(`id: ${EMAIL_CONNECTOR_PLACEHOLDER}`)).toBe(true);
    expect(hasUnresolvedConnectorPlaceholders(`id: ${SLACK_CONNECTOR_PLACEHOLDER}`)).toBe(true);
  });

  it('returns false when placeholders are resolved', () => {
    expect(hasUnresolvedConnectorPlaceholders('id: real-connector')).toBe(false);
  });
});
