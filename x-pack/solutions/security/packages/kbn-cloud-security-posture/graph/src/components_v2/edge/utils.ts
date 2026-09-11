/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { NodeShape } from '@kbn/cloud-security-posture-common/types/graph/latest';

export function getShapeHandlePosition(shape?: NodeShape) {
  switch (shape) {
    // Entity nodes render as rectangular cards that fill their bounding box.
    // Do not inset the path into the card, or the arrow sits under the node.
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
