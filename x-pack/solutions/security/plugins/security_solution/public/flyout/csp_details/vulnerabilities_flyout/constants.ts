/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type {
  FindingsVulnerabilityPanelExpandableFlyoutPropsNonPreview,
  FindingsVulnerabilityPanelExpandableFlyoutPropsPreview,
} from '@kbn/cloud-security-posture';

export const VulnerabilityFindingsPanelKey: FindingsVulnerabilityPanelExpandableFlyoutPropsNonPreview['id'] =
  'findings-vulnerability-panel';

export const VulnerabilityFindingsPreviewPanelKey: FindingsVulnerabilityPanelExpandableFlyoutPropsPreview['id'] =
  'findings-vulnerability-panel-preview';
