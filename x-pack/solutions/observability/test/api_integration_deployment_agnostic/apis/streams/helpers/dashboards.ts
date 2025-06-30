/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { KbnClient } from '@kbn/test';

export async function loadDashboards(kbnClient: KbnClient, archives: string[], spaceId: string) {
  // clear out all lingering dashboards
  const dashboards = await kbnClient.savedObjects.find({
    type: 'dashboard',
  });
  await kbnClient.savedObjects.bulkDelete({
    objects: dashboards.saved_objects.map((d) => ({ type: 'dashboard', id: d.id })),
  });

  for (const archive of archives) {
    await kbnClient.importExport.load(archive, { space: spaceId });
  }
}

export async function unloadDashboards(kbnClient: KbnClient, archives: string[], spaceId: string) {
  for (const archive of archives) {
    await kbnClient.importExport.unload(archive, { space: spaceId });
  }
}
