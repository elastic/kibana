/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Client } from '@elastic/elasticsearch';
import { resourceNames } from '@kbn/observability-ai-assistant-plugin/server/service';
import { ToolingLog } from '@kbn/tooling-log';
import path from 'path';
import { AI_ASSISTANT_SNAPSHOT_REPO_PATH } from '@kbn/test-suites-xpack-platform/api_integration_deployment_agnostic/default_configs/common_paths';

export async function restoreKbSnapshot({
  log,
  es,
  snapshotFolderName,
  snapshotName,
}: {
  log: ToolingLog;
  es: Client;
  snapshotFolderName: string;
  snapshotName: string;
}) {
  const snapshotLocation = path.join(AI_ASSISTANT_SNAPSHOT_REPO_PATH, snapshotFolderName);

  const snapshotRepoName = `my_repo_${snapshotFolderName}`;
  log.debug(`Creating snapshot repository "${snapshotRepoName}" from "${snapshotLocation}"`);
  await es.snapshot.createRepository({
    name: snapshotFolderName,
    repository: {
      type: 'fs',
      settings: { location: snapshotLocation },
    },
  });

  try {
    log.debug(`Restoring snapshot of "${resourceNames.concreteWriteIndexName.kb}"`);
    await es.snapshot.restore({
      repository: snapshotFolderName,
      snapshot: snapshotName,
      wait_for_completion: true,
      indices: resourceNames.concreteWriteIndexName.kb,
    });
  } catch (error) {
    log.error(`Error restoring snapshot: ${error.message}`);
    throw error;
  } finally {
    log.debug(`Deleting snapshot repository "${snapshotFolderName}"`);
    await es.snapshot.deleteRepository({ name: snapshotFolderName });
  }
}
