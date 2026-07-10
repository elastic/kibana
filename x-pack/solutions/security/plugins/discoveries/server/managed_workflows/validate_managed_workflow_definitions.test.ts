/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  ATTACK_DISCOVERY_ALERT_RETRIEVAL_WORKFLOW_ID,
  ATTACK_DISCOVERY_CUSTOM_VALIDATION_EXAMPLE_WORKFLOW_ID,
  ATTACK_DISCOVERY_GENERATION_WORKFLOW_ID,
  ATTACK_DISCOVERY_RUN_EXAMPLE_WORKFLOW_ID,
  ATTACK_DISCOVERY_SKILL_ALERT_RETRIEVAL_WORKFLOW_ID,
  ATTACK_DISCOVERY_SKILL_REPORT_WORKFLOW_ID,
  ATTACK_DISCOVERY_VALIDATE_WORKFLOW_ID,
  getManagedWorkflowDefinition,
} from '@kbn/workflows/managed';
import { validateLiquidTemplate } from '@kbn/workflows-yaml';
import { parseDocument } from 'yaml';

// The Attack Discovery managed workflow definitions in `@kbn/workflows/managed`
// are the runtime source-of-truth: `installStatic` installs them by id at plugin
// start. These are the same `.yaml` strings the platform hands to the Workflows
// engine, so validating them here guards the exact bytes we install (there is no
// plugin-local fixture copy to drift out of sync).
const AD_WORKFLOW_IDS = [
  ATTACK_DISCOVERY_ALERT_RETRIEVAL_WORKFLOW_ID,
  ATTACK_DISCOVERY_CUSTOM_VALIDATION_EXAMPLE_WORKFLOW_ID,
  ATTACK_DISCOVERY_GENERATION_WORKFLOW_ID,
  ATTACK_DISCOVERY_RUN_EXAMPLE_WORKFLOW_ID,
  ATTACK_DISCOVERY_SKILL_ALERT_RETRIEVAL_WORKFLOW_ID,
  ATTACK_DISCOVERY_SKILL_REPORT_WORKFLOW_ID,
  ATTACK_DISCOVERY_VALIDATE_WORKFLOW_ID,
] as const;

const getYaml = (id: string): string => {
  const definition = getManagedWorkflowDefinition(id);
  if (definition === undefined) {
    throw new Error(`Managed workflow '${id}' is not registered`);
  }
  if (typeof definition.yaml !== 'string') {
    throw new Error(`Managed workflow '${id}' does not expose a static yaml string`);
  }
  return definition.yaml;
};

describe('managed workflow definitions', () => {
  describe('concurrency settings', () => {
    it('the attack_discovery_generation workflow should not have concurrency limits', () => {
      const parsed = parseDocument(getYaml(ATTACK_DISCOVERY_GENERATION_WORKFLOW_ID)).toJSON();
      expect(parsed.settings?.concurrency).toBeUndefined();
    });
  });

  describe('liquid template validation', () => {
    it.each(AD_WORKFLOW_IDS)('%s should contain no Liquid template errors', (id) => {
      const yaml = getYaml(id);
      const yamlDocument = parseDocument(yaml);
      const errors = validateLiquidTemplate(yaml, yamlDocument);

      expect(errors).toEqual([]);
    });
  });
});
