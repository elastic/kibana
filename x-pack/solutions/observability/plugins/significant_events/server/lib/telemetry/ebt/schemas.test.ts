/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  agentBuilderKnowledgeIndicatorCreatedSchema,
  agentToolEventCreateSchema,
  agentToolEventInvestigationAttachSchema,
  agentToolEventSearchSchema,
  agentToolEventStatusUpdateSchema,
  agentToolEventWriteSchema,
  agentToolKnowledgeIndicatorIdentificationStartedSchema,
  detectionScanSchema,
  discoveryTriggeredSchema,
  knowledgeIndicatorFeaturesIdentifiedSchema,
  knowledgeIndicatorQueriesGeneratedSchema,
  onboardingScheduledSchema,
} from './schemas';

describe('workflow execution telemetry schemas', () => {
  it.each([discoveryTriggeredSchema, onboardingScheduledSchema])(
    'requires workflow_execution_id for workflow-only events',
    (schema) => {
      expect(schema.workflow_execution_id).toEqual(
        expect.objectContaining({
          type: 'keyword',
          _meta: expect.not.objectContaining({ optional: true }),
        })
      );
    }
  );

  it.each([
    agentBuilderKnowledgeIndicatorCreatedSchema,
    agentToolEventCreateSchema,
    agentToolEventInvestigationAttachSchema,
    agentToolEventSearchSchema,
    agentToolEventStatusUpdateSchema,
    agentToolEventWriteSchema,
    agentToolKnowledgeIndicatorIdentificationStartedSchema,
    detectionScanSchema,
    knowledgeIndicatorFeaturesIdentifiedSchema,
    knowledgeIndicatorQueriesGeneratedSchema,
  ])('allows workflow_execution_id to be absent for standalone tools', (schema) => {
    expect(schema.workflow_execution_id).toEqual(
      expect.objectContaining({
        type: 'keyword',
        _meta: expect.objectContaining({ optional: true }),
      })
    );
  });

  it('documents the existing compatibility aliases', () => {
    expect(onboardingScheduledSchema.execution_id._meta.description).toContain(
      'Deprecated alias of workflow_execution_id'
    );
    expect(discoveryTriggeredSchema.execution_id._meta.description).toContain(
      'Deprecated alias of workflow_execution_id'
    );
    expect(knowledgeIndicatorFeaturesIdentifiedSchema.run_id._meta.description).toContain(
      'equals workflow_execution_id for workflow invocations'
    );
  });

  it('separates the emitting workflow from the attached investigation workflow', () => {
    expect(agentToolEventInvestigationAttachSchema.workflow_execution_id._meta.optional).toBe(true);
    expect(agentToolEventInvestigationAttachSchema.investigation_workflow_execution_id).toEqual(
      expect.objectContaining({ type: 'keyword' })
    );
  });
});
