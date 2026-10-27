/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { PREFIX } from '../../../../../../flyout/shared/test_ids';

export const BLAST_RADIUS_TAB_TEST_ID = `${PREFIX}BlastRadiusTab` as const;
export const BLAST_RADIUS_RUN_BUTTON_TEST_ID = `${BLAST_RADIUS_TAB_TEST_ID}RunButton` as const;
export const BLAST_RADIUS_LOADING_TEST_ID = `${BLAST_RADIUS_TAB_TEST_ID}Loading` as const;
export const BLAST_RADIUS_ERROR_TEST_ID = `${BLAST_RADIUS_TAB_TEST_ID}Error` as const;
export const BLAST_RADIUS_SUMMARY_TEST_ID = `${BLAST_RADIUS_TAB_TEST_ID}Summary` as const;
export const BLAST_RADIUS_GRAPH_TEST_ID = `${BLAST_RADIUS_TAB_TEST_ID}Graph` as const;
export const BLAST_RADIUS_EXCLUSIONS_TEST_ID = `${BLAST_RADIUS_TAB_TEST_ID}Exclusions` as const;
export const BLAST_RADIUS_EXCLUSION_BADGE_TEST_ID =
  `${BLAST_RADIUS_TAB_TEST_ID}ExclusionBadge` as const;
export const BLAST_RADIUS_CLEAR_EXCLUSIONS_TEST_ID =
  `${BLAST_RADIUS_TAB_TEST_ID}ClearExclusions` as const;
export const BLAST_RADIUS_EXCLUDE_NODE_TEST_ID = `${BLAST_RADIUS_TAB_TEST_ID}ExcludeNode` as const;
