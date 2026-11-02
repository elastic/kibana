/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ERROR_CATEGORIES } from '@kbn/discoveries-schemas';

import type { AlertRetrievalResult } from '../../../../../invoke_alert_retrieval_workflow';
import { AttackDiscoveryError } from '../../../../../../../lib/errors/attack_discovery_error';
import { validateRetrievalResults } from '.';

const mockLegacyResult: AlertRetrievalResult = {
  alerts: ['alert-1'],
  alertsContextCount: 1,
  anonymizedAlerts: [],
  apiConfig: {
    action_type_id: '.gen-ai',
    connector_id: 'test-connector-id',
    model: 'gpt-4',
  },
  connectorName: 'Test Connector',
  replacements: {},
  workflowExecutions: [{ workflowId: 'legacy', workflowRunId: 'legacy-run' }],
  workflowId: 'legacy',
  workflowRunId: 'legacy-run',
};

describe('validateRetrievalResults', () => {
  it('does not throw when legacyResult is present', () => {
    expect(() =>
      validateRetrievalResults({
        customResults: [],
        legacyResult: mockLegacyResult,
        skillEnabled: false,
      })
    ).not.toThrow();
  });

  it('does not throw when customResults are present', () => {
    expect(() =>
      validateRetrievalResults({
        customResults: [
          {
            alerts: ['custom-alert'],
            alertsContextCount: 1,
            workflowId: 'custom-wf',
            workflowRunId: 'custom-run',
          },
        ],
        legacyResult: null,
        skillEnabled: false,
      })
    ).not.toThrow();
  });

  it('does not throw when both are present', () => {
    expect(() =>
      validateRetrievalResults({
        customResults: [
          {
            alerts: ['custom-alert'],
            alertsContextCount: 1,
            workflowId: 'custom-wf',
            workflowRunId: 'custom-run',
          },
        ],
        legacyResult: mockLegacyResult,
        skillEnabled: false,
      })
    ).not.toThrow();
  });

  it('does not throw when skillEnabled is true even though legacyResult is null and customResults are empty', () => {
    expect(() =>
      validateRetrievalResults({
        customResults: [],
        legacyResult: null,
        skillEnabled: true,
      })
    ).not.toThrow();
  });

  it('throws when skillEnabled is false and both legacyResult is null and customResults are empty', () => {
    expect(() =>
      validateRetrievalResults({
        customResults: [],
        legacyResult: null,
        skillEnabled: false,
      })
    ).toThrow(
      'No alert retrieval results: default retrieval is disabled or failed, and no custom workflows succeeded'
    );
  });

  it('throws an AttackDiscoveryError so the failure surfaces as a classified, troubleshootable error state', () => {
    expect(() =>
      validateRetrievalResults({
        customResults: [],
        legacyResult: null,
        skillEnabled: false,
      })
    ).toThrow(AttackDiscoveryError);
  });

  it('classifies the thrown error as a validation_error', () => {
    let caught: unknown;

    try {
      validateRetrievalResults({
        customResults: [],
        legacyResult: null,
        skillEnabled: false,
      });
    } catch (error) {
      caught = error;
    }

    expect((caught as AttackDiscoveryError).errorCategory).toBe(ERROR_CATEGORIES.validation_error);
  });
});
