/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import type { Capabilities } from '@kbn/core/types';

export function extractTimelineCapabilities(capabilities: Capabilities) {
  const timelineCrud = capabilities.securitySolutionTimeline?.crud === true;
  const timelineRead = capabilities.securitySolutionTimeline?.read === true;
  return { read: timelineRead, crud: timelineCrud };
}
