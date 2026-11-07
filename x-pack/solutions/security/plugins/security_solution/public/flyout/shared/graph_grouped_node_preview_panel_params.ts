/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { GraphGroupedNodePreviewPanelProps } from '@kbn/cloud-security-posture-graph';
import type { GraphEntryPoint } from '../../common/lib/telemetry';

/** Params of the legacy flyout's `GraphGroupedNodePreviewPanelKey` panel. */
export type GraphGroupedNodePreviewPanelParams = Omit<
  GraphGroupedNodePreviewPanelProps,
  'onShowDocument' | 'onShowEntity' | 'onTelemetryEvent'
> & {
  /**
   * Where the graph that opened this panel was launched from, used to attribute its telemetry.
   * Always set by the openers, but absent in panels restored from a URL that predates it.
   */
  entryPoint?: GraphEntryPoint;
};
