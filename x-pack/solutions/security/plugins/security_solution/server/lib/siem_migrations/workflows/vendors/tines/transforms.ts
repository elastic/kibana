/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { TinesStoryExport } from '../../../../../../common/siem_migrations/model/vendor/workflows/tines.gen';
import type { OriginalWorkflow } from '../../../../../../common/siem_migrations/model/workflow_migration.gen';

/** Maps a Tines story export onto the vendor-neutral original workflow document. */
export const transformTinesStoryToOriginalWorkflow = (
  story: TinesStoryExport
): OriginalWorkflow => ({
  id: story.guid != null && story.guid.length > 0 ? story.guid : story.name,
  vendor: 'tines',
  title: story.name,
  ...(typeof story.description === 'string' ? { description: story.description } : {}),
  data: JSON.stringify(story),
  format: 'json',
});
