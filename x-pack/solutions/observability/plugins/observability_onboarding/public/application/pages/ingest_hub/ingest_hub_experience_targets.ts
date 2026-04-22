/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { IngestHubVersion } from '../../version_switcher_widget';

/** Sidebar / route section for the Add data (integrations catalog) experience. */
export const INGEST_HUB_ADD_DATA_NAV_ID = 'integrations';

export function isIngestHubVersion2AddDataPage(
  activeVersion: IngestHubVersion,
  activeNavId: string
): boolean {
  return (
    (activeVersion === 'version2' || activeVersion === 'version3') &&
    activeNavId === INGEST_HUB_ADD_DATA_NAV_ID
  );
}
