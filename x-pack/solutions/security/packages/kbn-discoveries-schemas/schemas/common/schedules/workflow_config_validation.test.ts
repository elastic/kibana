/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  AT_LEAST_ONE_RETRIEVAL_TOGGLE_MESSAGE,
  WorkflowConfigWithRetrievalToggle,
  hasAtLeastOneRetrievalToggle,
} from './workflow_config_validation';

describe('hasAtLeastOneRetrievalToggle', () => {
  it('returns true when only the skill toggle is enabled', () => {
    expect(
      hasAtLeastOneRetrievalToggle({
        alert_retrieval_workflows_enabled: false,
        default_retrieval_enabled: false,
        skill_enabled: true,
      })
    ).toBe(true);
  });

  it('returns true when only the default retrieval toggle is enabled', () => {
    expect(
      hasAtLeastOneRetrievalToggle({
        alert_retrieval_workflows_enabled: false,
        default_retrieval_enabled: true,
        skill_enabled: false,
      })
    ).toBe(true);
  });

  it('returns true when only the alert retrieval workflows toggle is enabled', () => {
    expect(
      hasAtLeastOneRetrievalToggle({
        alert_retrieval_workflows_enabled: true,
        default_retrieval_enabled: false,
        skill_enabled: false,
      })
    ).toBe(true);
  });

  it('returns false when all three toggles are disabled', () => {
    expect(
      hasAtLeastOneRetrievalToggle({
        alert_retrieval_workflows_enabled: false,
        default_retrieval_enabled: false,
        skill_enabled: false,
      })
    ).toBe(false);
  });
});

describe('WorkflowConfigWithRetrievalToggle', () => {
  it('accepts an empty object (skill_enabled defaults to true)', () => {
    expect(WorkflowConfigWithRetrievalToggle.safeParse({}).success).toBe(true);
  });

  it('defaults skill_enabled to true', () => {
    const result = WorkflowConfigWithRetrievalToggle.parse({});

    expect(result.skill_enabled).toBe(true);
  });

  it('accepts a config with only the default retrieval toggle enabled', () => {
    expect(
      WorkflowConfigWithRetrievalToggle.safeParse({
        alert_retrieval_workflows_enabled: false,
        default_retrieval_enabled: true,
        skill_enabled: false,
      }).success
    ).toBe(true);
  });

  it('rejects a config with all three toggles disabled', () => {
    expect(
      WorkflowConfigWithRetrievalToggle.safeParse({
        alert_retrieval_workflows_enabled: false,
        default_retrieval_enabled: false,
        skill_enabled: false,
      }).success
    ).toBe(false);
  });

  it('reports the at-least-one-toggle message when all toggles are disabled', () => {
    const result = WorkflowConfigWithRetrievalToggle.safeParse({
      alert_retrieval_workflows_enabled: false,
      default_retrieval_enabled: false,
      skill_enabled: false,
    });

    expect(result.success ? undefined : result.error.issues[0].message).toBe(
      AT_LEAST_ONE_RETRIEVAL_TOGGLE_MESSAGE
    );
  });

  it('does not strip the composite toggle fields', () => {
    const result = WorkflowConfigWithRetrievalToggle.parse({
      alert_retrieval_mode: 'esql',
      alert_retrieval_workflow_ids: ['wf-1'],
      alert_retrieval_workflows_enabled: true,
      default_retrieval_enabled: true,
      esql_query: 'FROM .alerts-security.alerts-default',
      skill_enabled: false,
      validation_workflow_id: 'custom-validate',
    });

    expect(result).toEqual({
      alert_retrieval_mode: 'esql',
      alert_retrieval_workflow_ids: ['wf-1'],
      alert_retrieval_workflows_enabled: true,
      default_retrieval_enabled: true,
      esql_query: 'FROM .alerts-security.alerts-default',
      skill_enabled: false,
      validation_workflow_id: 'custom-validate',
    });
  });
});
