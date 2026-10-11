/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { readFileSync, readdirSync, statSync } from 'fs';
import { join, resolve } from 'path';
import type { KibanaRole } from '@kbn/scout-security';
import { ALERTZERO_ACTIONS_URL } from '@kbn/alertzero-common';

/** Internal APIs require the internal-origin header and an explicit version. */
export const INTERNAL_HEADERS = {
  'kbn-xsrf': 'scout',
  'x-elastic-internal-origin': 'kibana',
  'elastic-api-version': '1',
} as const;

/**
 * `ALERTZERO_ACTIONS_URL` is absolute (`/internal/alertzero/actions`); Scout's
 * apiClient takes a path without the leading slash.
 */
export const LIST_ACTIONS_PATH = ALERTZERO_ACTIONS_URL.replace(/^\//, '');

/**
 * Ids and categories of the action workflows AlertZero installs at start,
 * derived from the managed workflow sources themselves so the suite tracks
 * the catalog's source of truth instead of a stale copy: a workflow added or
 * re-categorised upstream is picked up automatically.
 *
 * Deliberately runtime `fs` reads rather than imports from
 * `@kbn/workflows/managed`: that barrel pulls in the managed workflow
 * definitions, which raw-import their `.yaml` files, and Playwright's
 * transpiler cannot resolve a YAML import — the whole spec fails to load.
 * Reading the files at runtime sidesteps the transpiler entirely.
 *
 * The workflow id lives in each `action_*.ts` (`export const ..._WORKFLOW_ID =
 * '<id>'`) and the category in the sibling `.yaml` under
 * `consts.actionMetadata.category`. Both are read with narrow, indent-aware
 * extraction rather than full YAML parsing to avoid a parser dependency in the
 * Playwright sandbox.
 */
const ACTIONS_DIR = resolve(
  'src/platform/packages/shared/kbn-workflows/managed/definitions/alertzero/actions'
);

function listYamlFiles(dir: string): string[] {
  return readdirSync(dir).flatMap((entry) => {
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) {
      return listYamlFiles(full);
    }
    return full.endsWith('.yaml') && /[/]action_[^/]+\.yaml$/.test(full) ? [full] : [];
  });
}

function workflowIdOf(yamlPath: string): string {
  const tsPath = yamlPath.replace(/\.yaml$/, '.ts');
  const match = readFileSync(tsPath, 'utf8').match(/WORKFLOW_ID\s*=\s*'([^']+)'/);
  if (!match) {
    throw new Error(
      `No *_WORKFLOW_ID literal found in ${tsPath}: cannot derive expected catalog ids`
    );
  }
  return match[1];
}

/**
 * Extracts `consts.actionMetadata.category` by tracking indentation depth, so
 * a `category:` anywhere else in the workflow can never be picked up.
 */
function categoryOf(yamlPath: string): string | undefined {
  const lines = readFileSync(yamlPath, 'utf8').split('\n');
  let inActionMetadata = false;
  let metadataIndent = -1;
  for (const line of lines) {
    if (!line.trim() || line.trim().startsWith('#')) {
      continue;
    }
    const indent = line.length - line.trimStart().length;
    if (inActionMetadata) {
      if (indent <= metadataIndent) {
        return undefined; // left actionMetadata without a category
      }
      const match = line.trim().match(/^category:\s*(\S+)\s*$/);
      if (match) {
        return match[1];
      }
    } else {
      const match = line.trim().match(/^actionMetadata:\s*$/);
      if (match) {
        inActionMetadata = true;
        metadataIndent = indent;
      }
    }
  }
  return undefined;
}

function deriveActionsByCategory(): Record<string, string[]> {
  if (!statSync(ACTIONS_DIR, { throwIfNoEntry: false })) {
    throw new Error(
      `Managed action workflows not found at ${ACTIONS_DIR} (cwd: ${process.cwd()}); cannot derive expected catalog ids`
    );
  }
  const byCategory: Record<string, string[]> = {};
  for (const yamlPath of listYamlFiles(ACTIONS_DIR)) {
    const id = workflowIdOf(yamlPath);
    const category = categoryOf(yamlPath);
    if (category === undefined) {
      throw new Error(
        `No consts.actionMetadata.category in ${yamlPath}: cannot derive category for ${id}`
      );
    }
    (byCategory[category] ??= []).push(id);
  }
  if (Object.keys(byCategory).length === 0) {
    throw new Error(
      `No action workflows discovered under ${ACTIONS_DIR}: expected catalog is empty`
    );
  }
  return byCategory;
}

export const ACTION_IDS_BY_CATEGORY: Record<string, string[]> = deriveActionsByCategory();

export const ALL_ACTION_IDS: string[] = Object.values(ACTION_IDS_BY_CATEGORY).flat();

export const ISOLATE_HOST_ACTION_ID = workflowIdOf(
  join(ACTIONS_DIR, 'defend', 'action_isolate_host.yaml')
);

/** Mirrors `ACTION_CATEGORIES_QUERY_PARAM_MAX_ITEMS` in the route. */
export const CATEGORIES_MAX_ITEMS = 20;

/**
 * Grants `alertzero_read` through the AlertZero feature's `read` privilege — the
 * privilege the route requires.
 */
export const ALERTZERO_READ_ROLE: KibanaRole = {
  elasticsearch: { cluster: [], indices: [] },
  kibana: [{ base: [], feature: { alertzero: ['read'] }, spaces: ['*'] }],
};

/**
 * A fully-provisioned Kibana user that holds no AlertZero privilege at all. Used
 * to prove the route's authz is a real boundary rather than an authentication
 * side effect: this user is logged in, just not entitled.
 */
export const NO_ALERTZERO_PRIVILEGE_ROLE: KibanaRole = {
  elasticsearch: { cluster: [], indices: [] },
  kibana: [{ base: [], feature: { discover: ['read'] }, spaces: ['*'] }],
};
