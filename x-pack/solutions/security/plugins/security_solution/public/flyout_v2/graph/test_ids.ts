/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { PREFIX } from '../../flyout/shared/test_ids';

export const GRAPH_TEST_ID = `${PREFIX}Graph` as const;
export const GRAPH_VISUALIZATION_TEST_ID = `${PREFIX}GraphVisualization` as const;

/**
 * Identifier used to register the graph visualization tab in the legacy left-panel
 * `visualize_tab`. Lives in this leaf module so consumers can read it without
 * dragging in the heavy graph component (which now imports DocumentFlyoutWrapper /
 * Network and would otherwise create an import cycle through the legacy left panel).
 */
export const GRAPH_ID = 'graph-visualization' as const;
