/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { buildAlertRetrievalWorkflowInputs } from '.';

describe('buildAlertRetrievalWorkflowInputs', () => {
  const defaultProps = {
    alertsIndexPattern: '.alerts-security.alerts-default',
    anonymizationFields: [{ anonymized: true, field: 'host.name' }],
    apiConfig: {
      action_type_id: '.gen-ai',
      connector_id: 'test-connector-id',
      model: 'gpt-4',
    },
    end: '2024-01-01T00:00:00Z',
    filter: { bool: { must: [] } },
    size: 123,
    start: '2023-12-01T00:00:00Z',
  };

  it('includes alerts_index_pattern', () => {
    const inputs = buildAlertRetrievalWorkflowInputs(defaultProps);

    expect(inputs).toHaveProperty('alerts_index_pattern', '.alerts-security.alerts-default');
  });

  it('includes api_config', () => {
    const inputs = buildAlertRetrievalWorkflowInputs(defaultProps);

    expect(inputs).toHaveProperty('api_config', {
      action_type_id: '.gen-ai',
      connector_id: 'test-connector-id',
      model: 'gpt-4',
    });
  });

  it('defaults anonymization_fields to an empty array', () => {
    const inputs = buildAlertRetrievalWorkflowInputs({
      ...defaultProps,
      anonymizationFields: undefined,
    });

    expect(inputs).toHaveProperty('anonymization_fields', []);
  });

  it('defaults size to 100', () => {
    const inputs = buildAlertRetrievalWorkflowInputs({ ...defaultProps, size: undefined });

    expect(inputs).toHaveProperty('size', 100);
  });

  it('includes esql_query when provided', () => {
    const esqlQuery = 'FROM .alerts-security.alerts-default | LIMIT 10';
    const inputs = buildAlertRetrievalWorkflowInputs({ ...defaultProps, esqlQuery });

    expect(inputs).toHaveProperty('esql_query', esqlQuery);
  });

  it('sets esql_query to undefined when not provided', () => {
    const inputs = buildAlertRetrievalWorkflowInputs(defaultProps);

    expect(inputs).toHaveProperty('esql_query', undefined);
  });

  it('includes start and end', () => {
    const inputs = buildAlertRetrievalWorkflowInputs(defaultProps);

    expect(inputs).toHaveProperty('start', '2023-12-01T00:00:00Z');
    expect(inputs).toHaveProperty('end', '2024-01-01T00:00:00Z');
  });
});
