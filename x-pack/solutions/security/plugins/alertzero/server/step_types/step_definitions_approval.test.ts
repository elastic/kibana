/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { readFileSync } from 'fs';
import path from 'path';
import { REPO_ROOT } from '@kbn/repo-info';
import { createSHA256Hash } from '@kbn/crypto';
import { stableStringify } from '@kbn/std';
import { z } from '@kbn/zod/v4';
import type { CommonStepDefinition } from '@kbn/workflows-extensions/common';
import { reportWorkerOutcomeStepCommonDefinition } from '../../common/step_types';
import { buildRuleTuningWikiEntryStepCommonDefinition } from '../../common/step_types/build_rule_tuning_wiki_entry_step';

/**
 * Each custom workflow step needs an approval file holding the SHA-256 of its serializable
 * contract. The central Scout approval spec is skipped
 * (https://github.com/elastic/kibana/issues/265012), so this test keeps these files in sync. The
 * hash is computed exactly like the server route (`get_step_definitions.ts`).
 */
const APPROVED_STEP_DEFINITIONS_DIR = path.join(
  REPO_ROOT,
  'x-pack/platform/plugins/shared/workflows_extensions/test/scout/api/fixtures/approved_step_definitions'
);

const schemaToJson = (schema?: z.ZodType): unknown => (schema ? z.toJSONSchema(schema) : undefined);

const computeDefinitionHash = (definition: CommonStepDefinition): string =>
  createSHA256Hash(
    stableStringify({
      label: definition.label,
      description: definition.description,
      category: definition.category,
      stability: definition.stability,
      deprecation: definition.deprecation,
      inputSchema: schemaToJson(definition.inputSchema),
      outputSchema: schemaToJson(definition.outputSchema),
      configSchema: schemaToJson(definition.configSchema),
    })
  );

const loadApprovedHash = (stepId: string): string | null => {
  try {
    return readFileSync(path.join(APPROVED_STEP_DEFINITIONS_DIR, `${stepId}.txt`), 'utf8').trim();
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
      return null;
    }
    throw error;
  }
};

describe('AlertZero step definition approvals', () => {
  it.each([buildRuleTuningWikiEntryStepCommonDefinition, reportWorkerOutcomeStepCommonDefinition])(
    'has an approval file for $id matching its contract',
    (definition) => {
      expect(loadApprovedHash(definition.id)).toBe(
        computeDefinitionHash(definition as CommonStepDefinition)
      );
    }
  );
});
