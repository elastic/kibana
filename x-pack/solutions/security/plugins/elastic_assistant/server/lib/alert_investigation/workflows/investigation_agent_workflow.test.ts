/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  investigationAgentWorkflowDefinition,
  INVESTIGATION_AGENT_WORKFLOW_ID,
} from './investigation_agent_workflow';

describe('Investigation Agent Workflow - Integration Tests', () => {
  describe('Workflow Definition Validation', () => {
    it('should have correct workflow ID', () => {
      expect(INVESTIGATION_AGENT_WORKFLOW_ID).toBe('security.autonomousInvestigation');
      expect(investigationAgentWorkflowDefinition.id).toBe(INVESTIGATION_AGENT_WORKFLOW_ID);
    });

    it('should have manual trigger (invoked by parent workflow)', () => {
      expect(investigationAgentWorkflowDefinition.trigger.type).toBe('manual');
    });

    it('should have required input schema', () => {
      expect(investigationAgentWorkflowDefinition.input).toBeDefined();
      expect(investigationAgentWorkflowDefinition.input.case_id).toBeDefined();
      expect(investigationAgentWorkflowDefinition.input.alert_ids).toBeDefined();
      expect(investigationAgentWorkflowDefinition.input.case_title).toBeDefined();
    });

    it('should have 3 steps: gather context, investigate, update case', () => {
      expect(investigationAgentWorkflowDefinition.steps).toHaveLength(3);

      const stepTypes = investigationAgentWorkflowDefinition.steps.map((s) => s.type);
      expect(stepTypes).toEqual([
        'elasticsearch.query',
        'ai.agent', // Native Agent Builder step!
        'cases.addComment',
      ]);
    });

    it('should use ai.agent step with structured output schema', () => {
      const investigateStep = investigationAgentWorkflowDefinition.steps.find(
        (s) => s.id === 'investigate'
      );

      expect(investigateStep).toBeDefined();
      expect(investigateStep?.type).toBe('ai.agent');
      expect(investigateStep?.input.schema).toBeDefined();

      // Verify structured output schema
      const schema = investigateStep?.input.schema;
      expect(schema.properties.attack_pattern).toBeDefined();
      expect(schema.properties.mitre_techniques).toBeDefined();
      expect(schema.properties.severity).toBeDefined();
      expect(schema.properties.attack_discovery_summary).toBeDefined();
      expect(schema.properties.recommended_actions).toBeDefined();
    });

    it('should have agent-id configuration', () => {
      const investigateStep = investigationAgentWorkflowDefinition.steps.find(
        (s) => s.id === 'investigate'
      );

      expect(investigateStep?.config['agent-id']).toBe('security-investigation-agent');
      expect(investigateStep?.config['create-conversation']).toBe(true);
    });

    it('should have valid output mapping', () => {
      expect(investigationAgentWorkflowDefinition.output).toBeDefined();
      expect(investigationAgentWorkflowDefinition.output.investigation_complete).toBe(true);
      expect(investigationAgentWorkflowDefinition.output.agent_conversation_id).toContain(
        'conversation_id'
      );
    });
  });

  describe('Workflow Step Integration', () => {
    it('should pass alert context to agent via message input', () => {
      const investigateStep = investigationAgentWorkflowDefinition.steps[1];
      const message = investigateStep.input.message;

      // Should reference workflow inputs and context
      expect(message).toContain('${input.case_title}');
      expect(message).toContain('${gather_context.output.hits.length}');
      expect(message).toContain('${gather_context.output.hits');
    });

    it('should use structured output for type-safe agent responses', () => {
      const investigateStep = investigationAgentWorkflowDefinition.steps[1];
      const schema = investigateStep.input.schema;

      // Severity enum should be defined
      expect(schema.properties.severity.enum).toEqual(['low', 'medium', 'high', 'critical']);

      // Arrays should have item types
      expect(schema.properties.mitre_techniques.type).toBe('array');
      expect(schema.properties.mitre_techniques.items.type).toBe('string');
    });

    it('should update case with agent findings', () => {
      const updateStep = investigationAgentWorkflowDefinition.steps[2];

      expect(updateStep.type).toBe('cases.addComment');
      expect(updateStep.config.case_id).toContain('${input.case_id}');

      // Comment should include all agent outputs
      const comment = updateStep.config.comment.comment;
      expect(comment).toContain('${investigate.output.structured_output.attack_pattern}');
      expect(comment).toContain('${investigate.output.structured_output.severity}');
      expect(comment).toContain('${investigate.output.structured_output.mitre_techniques');
      expect(comment).toContain('${investigate.output.conversation_id}');
    });
  });

  describe('Native ai.agent Step Usage', () => {
    it('should demonstrate correct ai.agent step configuration', () => {
      const investigateStep = investigationAgentWorkflowDefinition.steps.find(
        (s) => s.type === 'ai.agent'
      );

      // Validates our workflow uses ai.agent correctly
      expect(investigateStep).toMatchObject({
        type: 'ai.agent',
        config: {
          'agent-id': expect.any(String),
          'connector-id': expect.any(String),
          'create-conversation': true,
        },
        input: {
          message: expect.any(String),
          schema: expect.any(Object),
        },
      });
    });

    it('should have all required schema fields for security investigation', () => {
      const schema = investigationAgentWorkflowDefinition.steps[1].input.schema;

      const requiredFields = [
        'attack_pattern',
        'mitre_techniques',
        'severity',
        'attack_discovery_summary',
        'recommended_actions',
      ];

      expect(schema.required).toEqual(requiredFields);

      // All required fields should be in properties
      requiredFields.forEach((field) => {
        expect(schema.properties[field]).toBeDefined();
      });
    });
  });

  describe('Integration Readiness', () => {
    it('should be ready to use when security-investigation-agent exists', () => {
      // This workflow is ready to use when:
      // 1. Agent created in Agent Builder with ID 'security-investigation-agent'
      // 2. Agent has tools: ES query, Entity Store, Attack Discovery
      // 3. Default connector configured

      const workflow = investigationAgentWorkflowDefinition;

      // Workflow structure is complete
      expect(workflow.id).toBeDefined();
      expect(workflow.steps).toHaveLength(3);
      expect(workflow.input).toBeDefined();
      expect(workflow.output).toBeDefined();

      // Agent step is properly configured
      const agentStep = workflow.steps.find((s) => s.type === 'ai.agent');
      expect(agentStep?.config['agent-id']).toBe('security-investigation-agent');
    });

    it('should provide clear integration instructions in code comments', () => {
      // Verify integration notes exist (file should have integration guidance)
      const workflowFile = require.resolve('./investigation_agent_workflow');
      const fs = require('fs');
      const content = fs.readFileSync(workflowFile, 'utf-8');

      expect(content).toContain('Integration Notes');
      expect(content).toContain('Agent Builder');
      expect(content).toContain('ai.agent'); // Native workflow step type
    });
  });
});
