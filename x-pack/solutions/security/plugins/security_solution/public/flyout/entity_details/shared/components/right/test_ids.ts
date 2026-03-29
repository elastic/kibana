/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { PREFIX } from '../../../../shared/test_ids';

const HEADER_TEST_ID = 'Header';
const CONTENT_TEST_ID = 'Content';

export const VISUALIZATIONS_TEST_ID = `${PREFIX}Visualizations` as const;
export const VISUALIZATIONS_SECTION_HEADER_TEST_ID = VISUALIZATIONS_TEST_ID + HEADER_TEST_ID;
export const VISUALIZATIONS_SECTION_CONTENT_TEST_ID = VISUALIZATIONS_TEST_ID + CONTENT_TEST_ID;

export const GRAPH_PREVIEW_TEST_ID = `${PREFIX}GraphPreview` as const;
export const GRAPH_PREVIEW_LOADING_TEST_ID = `${GRAPH_PREVIEW_TEST_ID}Loading` as const;
