/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { readdirSync, readFileSync } from 'fs';
import { join } from 'path';
import { parseDocument } from 'yaml';
import { validateLiquidTemplate } from '@kbn/workflows-yaml';

const DEFINITIONS_DIR = __dirname;

const getWorkflowYamlFiles = (): Array<{ fileName: string; content: string }> =>
  readdirSync(DEFINITIONS_DIR)
    .filter((f) => f.endsWith('.workflow.yaml'))
    .sort()
    .map((fileName) => ({
      content: readFileSync(join(DEFINITIONS_DIR, fileName), 'utf-8'),
      fileName,
    }));

describe('bundled workflow definitions', () => {
  const workflowFiles = getWorkflowYamlFiles();

  it('should discover at least one workflow YAML file', () => {
    expect(workflowFiles.length).toBeGreaterThan(0);
  });

  describe('concurrency settings', () => {
    it('the attack_discovery_generation workflow should not have concurrency limits', () => {
      const generationWorkflow = workflowFiles.find(
        ({ fileName }) => fileName === 'attack_discovery_generation.workflow.yaml'
      );
      expect(generationWorkflow).toBeDefined();

      const parsed = parseDocument(generationWorkflow!.content).toJSON();
      expect(parsed.settings?.concurrency).toBeUndefined();
    });
  });

  describe('liquid template validation', () => {
    workflowFiles.forEach(({ fileName, content }) => {
      it(`${fileName} should contain no Liquid template errors`, () => {
        const yamlDocument = parseDocument(content);
        const errors = validateLiquidTemplate(content, yamlDocument);

        expect(errors).toEqual([]);
      });
    });
  });
});
