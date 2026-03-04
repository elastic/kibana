/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { buildGenericEntityFlyoutPreviewQuery } from '@kbn/entity-store/public';
import type { UseCspOptions } from '@kbn/cloud-security-posture-common/types/findings';

/**
 * Builds CSP preview options for useHasMisconfigurations and useHasVulnerabilities
 * by applying entity-store EUID logic to entity identifiers.
 * Call this in security solution and pass the result to the hooks.
 */
export const buildEntityFlyoutPreviewCspOptions = (
  entityIdentifiers: Record<string, string>
): UseCspOptions => ({
  query: buildGenericEntityFlyoutPreviewQuery(entityIdentifiers),
  sort: [],
  enabled: true,
  pageSize: 1,
});
