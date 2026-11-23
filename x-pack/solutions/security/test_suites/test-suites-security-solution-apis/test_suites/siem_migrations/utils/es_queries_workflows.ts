/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Client } from '@elastic/elasticsearch';

const SIEM_MIGRATIONS_WORKFLOWS_BASE_INDEX_PATTERN = '.kibana-siem-workflow-migrations';
export const WORKFLOW_MIGRATIONS_MIGRATIONS_INDEX_PATTERN = `${SIEM_MIGRATIONS_WORKFLOWS_BASE_INDEX_PATTERN}-migrations-default`;
export const WORKFLOW_MIGRATIONS_WORKFLOWS_INDEX_PATTERN = `${SIEM_MIGRATIONS_WORKFLOWS_BASE_INDEX_PATTERN}-workflows-default`;

export interface IndexedWorkflowMigrationWorkflow {
  migration_id: string;
  status?: string;
  original_workflow: {
    id: string;
    vendor: string;
    title: string;
    description?: string;
    data: string;
    format: string;
  };
}

export const getWorkflowMigrationFromES = async ({
  es,
  migrationId,
}: {
  es: Client;
  migrationId: string;
}) => {
  return es.search({
    index: WORKFLOW_MIGRATIONS_MIGRATIONS_INDEX_PATTERN,
    query: {
      terms: {
        _id: [migrationId],
      },
    },
  });
};

export const getWorkflowsPerMigrationFromES = async ({
  es,
  migrationId,
}: {
  es: Client;
  migrationId: string;
}) => {
  return es.search<IndexedWorkflowMigrationWorkflow>({
    index: WORKFLOW_MIGRATIONS_WORKFLOWS_INDEX_PATTERN,
    size: 10000,
    query: {
      term: {
        migration_id: migrationId,
      },
    },
  });
};

/** Sets one stored workflow to `failed` so retry and translation-stats tests can cover that state. */
export const markWorkflowFailed = async ({
  es,
  migrationId,
  workflowId,
}: {
  es: Client;
  migrationId: string;
  workflowId: string;
}): Promise<void> => {
  const workflows = await getWorkflowsPerMigrationFromES({ es, migrationId });
  const hit = workflows.hits.hits.find((item) => item._id === workflowId);
  if (!hit?._index || !hit._id) {
    throw new Error(`Workflow ${workflowId} was not stored for migration ${migrationId}`);
  }
  await es.update({
    index: hit._index,
    id: hit._id,
    refresh: 'wait_for',
    doc: { status: 'failed' },
  });
};

export const deleteAllWorkflowMigrations = async (es: Client): Promise<void> => {
  await es.deleteByQuery({
    index: [
      WORKFLOW_MIGRATIONS_MIGRATIONS_INDEX_PATTERN,
      WORKFLOW_MIGRATIONS_WORKFLOWS_INDEX_PATTERN,
    ],
    query: {
      match_all: {},
    },
    conflicts: 'proceed',
    ignore_unavailable: true,
    refresh: true,
  });
};
