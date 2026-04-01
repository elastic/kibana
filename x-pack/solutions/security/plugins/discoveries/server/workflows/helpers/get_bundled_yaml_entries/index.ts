/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { createHash } from 'crypto';
import { readFileSync } from 'fs';
import { join } from 'path';

import type { Logger } from '@kbn/core/server';

export type RequiredDefaultWorkflowKey = 'default_alert_retrieval' | 'generation' | 'validate';
export type OptionalDefaultWorkflowKey =
  | 'custom_validation_example'
  | 'esql_example_alert_retrieval'
  | 'run_example';
export type AllDefaultWorkflowKey = RequiredDefaultWorkflowKey | OptionalDefaultWorkflowKey;

export interface BundledYamlEntry {
  hash: string; // SHA-256 hex digest of trimmed YAML
  key: AllDefaultWorkflowKey;
  yaml: string; // trimmed YAML content
}

const ALL_WORKFLOW_YAML_PATHS: ReadonlyArray<{
  key: AllDefaultWorkflowKey;
  yamlPath: string;
}> = [
  {
    key: 'custom_validation_example',
    yamlPath: 'attack_discovery_custom_validation_example.workflow.yaml',
  },
  {
    key: 'default_alert_retrieval',
    yamlPath: 'default_attack_discovery_alert_retrieval.workflow.yaml',
  },
  {
    key: 'esql_example_alert_retrieval',
    yamlPath: 'attack_discovery_esql_example.workflow.yaml',
  },
  {
    key: 'generation',
    yamlPath: 'attack_discovery_generation.workflow.yaml',
  },
  {
    key: 'run_example',
    yamlPath: 'attack_discovery_run_example.workflow.yaml',
  },
  {
    key: 'validate',
    yamlPath: 'attack_discovery_validate.workflow.yaml',
  },
];

let cachedEntries: ReadonlyMap<AllDefaultWorkflowKey, BundledYamlEntry> | null = null;

/**
 * Reads all bundled workflow YAML files from disk (3 required + 3 optional) and
 * computes SHA-256 hashes for efficient comparison. Results are cached in a
 * module-level variable since bundled files never change at runtime.
 *
 * Missing files are handled gracefully: a warning is logged and the entry
 * is omitted from the returned map.
 */
export const getBundledYamlEntries = (
  logger: Logger
): ReadonlyMap<AllDefaultWorkflowKey, BundledYamlEntry> => {
  if (cachedEntries !== null) {
    return cachedEntries;
  }

  const entries = new Map<AllDefaultWorkflowKey, BundledYamlEntry>();

  for (const { key, yamlPath } of ALL_WORKFLOW_YAML_PATHS) {
    try {
      const fullPath = join(__dirname, '../../definitions/', yamlPath);
      const yaml = readFileSync(fullPath, 'utf-8').trim();
      const hash = createHash('sha256').update(yaml).digest('hex');

      entries.set(key, { hash, key, yaml });
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      logger.warn(
        () => `getBundledYamlEntries: failed to read bundled YAML '${yamlPath}': ${message}`
      );
    }
  }

  cachedEntries = entries;
  return cachedEntries;
};

/** Resets the module-level cache. Intended for use in tests only. */
export const resetBundledYamlEntriesCache = (): void => {
  cachedEntries = null;
};
