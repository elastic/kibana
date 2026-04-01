/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { validateWorkflowYaml, type ValidateWorkflowYamlResult } from '.';

const VALID_WORKFLOW_YAML = `name: test-workflow
version: '1'
description: A test alert retrieval workflow
triggers:
  - type: manual
steps:
  - name: retrieve-alerts
    type: elasticsearch.search
    with:
      request:
        method: GET
        path: /.alerts-security.alerts-*/_search
        body:
          size: 100
          query:
            bool:
              filter:
                - range:
                    "@timestamp":
                      gte: "now-24h"`;

describe('validateWorkflowYaml', () => {
  describe('valid YAML', () => {
    it('returns a successful result for valid workflow YAML', () => {
      const result: ValidateWorkflowYamlResult = validateWorkflowYaml(VALID_WORKFLOW_YAML);

      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.workflow.name).toBe('test-workflow');
        expect(result.workflow.description).toBe('A test alert retrieval workflow');
        expect(result.workflow.steps).toHaveLength(1);
        expect(result.workflow.steps[0].name).toBe('retrieve-alerts');
      }
    });

    it('sets version to "1" by default when not specified', () => {
      const yamlWithoutVersion = `name: no-version-workflow
triggers:
  - type: manual
steps:
  - name: step-1
    type: elasticsearch.search
    with:
      request:
        method: GET
        path: /my-index/_search`;

      const result = validateWorkflowYaml(yamlWithoutVersion);

      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.workflow.version).toBe('1');
      }
    });
  });

  describe('YAML parse errors', () => {
    it('returns an error for invalid YAML syntax', () => {
      const invalidYaml = `name: test
  bad indentation:
    - this is broken
  : missing key`;

      const result = validateWorkflowYaml(invalidYaml);

      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.errors).toHaveLength(1);
        expect(result.errors[0]).toContain('YAML parse error');
      }
    });

    it('returns an error for non-object YAML', () => {
      const result = validateWorkflowYaml('just a plain string');

      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.errors).toHaveLength(1);
        expect(result.errors[0]).toContain('did not parse to a valid object');
      }
    });

    it('returns an error for YAML that parses to null', () => {
      const result = validateWorkflowYaml('~');

      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.errors).toHaveLength(1);
        expect(result.errors[0]).toContain('did not parse to a valid object');
      }
    });
  });

  describe('schema validation errors', () => {
    it('returns errors when required fields are missing', () => {
      const missingFieldsYaml = `description: A workflow without required fields`;

      const result = validateWorkflowYaml(missingFieldsYaml);

      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.errors.length).toBeGreaterThan(0);
      }
    });

    it('returns errors when name is empty', () => {
      const emptyNameYaml = `name: ""
triggers:
  - type: manual
steps:
  - name: step-1
    type: elasticsearch.search
    with:
      request:
        method: GET
        path: /my-index/_search`;

      const result = validateWorkflowYaml(emptyNameYaml);

      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.errors.some((e) => e.includes('name'))).toBe(true);
      }
    });

    it('returns errors when steps array is empty', () => {
      const emptyStepsYaml = `name: test-workflow
triggers:
  - type: manual
steps: []`;

      const result = validateWorkflowYaml(emptyStepsYaml);

      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.errors.length).toBeGreaterThan(0);
      }
    });

    it('returns errors when triggers array is empty', () => {
      const emptyTriggersYaml = `name: test-workflow
triggers: []
steps:
  - name: step-1
    type: elasticsearch.search
    with:
      request:
        method: GET
        path: /my-index/_search`;

      const result = validateWorkflowYaml(emptyTriggersYaml);

      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.errors.length).toBeGreaterThan(0);
      }
    });

    it('includes field paths in error messages', () => {
      const badStepsYaml = `name: test-workflow
triggers:
  - type: manual
steps:
  - name: ""
    type: elasticsearch.search
    with:
      request:
        method: GET
        path: /my-index/_search`;

      const result = validateWorkflowYaml(badStepsYaml);

      expect(result.ok).toBe(false);
      if (!result.ok) {
        // Errors should include path-like information
        expect(result.errors.some((e) => e.includes('steps') || e.includes('name'))).toBe(true);
      }
    });
  });
});
