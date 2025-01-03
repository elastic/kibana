/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { NodeShape } from '@kbn/cloud-security-posture-common/types/graph/latest';

export function getShapeHandlePosition(shape?: NodeShape) {
  switch (shape) {
    case 'hexagon':
      return 14;
    case 'pentagon':
      return 14;
    case 'ellipse':
      return 13;
    case 'rectangle':
      return 16;
    case 'diamond':
      return 10;
    case 'label':
      return 3;
    case 'group':
      return 0;
    default:
      return 0;
  }
}
