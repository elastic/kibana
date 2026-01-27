/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export {
  isArtifactGlobal,
  isArtifactByPolicy,
  getPolicyIdsFromArtifact,
  getEffectedPolicySelectionByTags,
  getArtifactTagsByPolicySelection,
} from './utils';

export {
  BY_POLICY_ARTIFACT_TAG_PREFIX,
  GLOBAL_ARTIFACT_TAG,
  ADVANCED_MODE_TAG,
  FILTER_PROCESS_DESCENDANTS_TAG,
  TRUSTED_PROCESS_DESCENDANTS_TAG,
} from './constants';
