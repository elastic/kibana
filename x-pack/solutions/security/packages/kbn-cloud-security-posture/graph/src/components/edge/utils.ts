/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { NodeShape } from '@kbn/cloud-security-posture-common/types/graph/latest';

/**
 * Path endpoint inset from the XYFlow handle.
 *
 * Entity shapes render as edge-handle cards (`CardNode`), so the handle already sits on
 * the card border — no inset (otherwise the arrow tip is buried under the opaque card).
 * Label / relationship pills keep a small inset for their rounded edges.
 */
export function getShapeHandlePosition(shape?: NodeShape) {
  switch (shape) {
    case 'hexagon':
    case 'pentagon':
    case 'ellipse':
    case 'rectangle':
    case 'diamond':
      return 0;
    case 'label':
    case 'relationship':
      return 3;
    case 'group':
      return 0;
    default:
      return 0;
  }
}
