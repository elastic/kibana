/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { NodeShape } from '@kbn/cloud-security-posture-common/types/graph/latest';

export function getShapeHandlePosition(shape?: NodeShape) {
  switch (shape) {
    // Entity shapes (hexagon, pentagon, ellipse, rectangle, diamond) all render as rectangular
    // EntityCardNode cards. A small inset (3 px) tucks the arrowhead tip just behind the card
    // border so the base of the arrow sits flush with the card edge — this prevents a visual
    // gap where the arrowhead appears to float outside the card.
    // The old values (14–21 px) were designed for SVG-circle/hexagon shapes whose handle was
    // deeply inset from the bounding-box edge; those were far too large for rectangular cards.
    case 'hexagon':
    case 'pentagon':
    case 'ellipse':
    case 'rectangle':
    case 'diamond':
      return 3;
    case 'label':
    case 'relationship':
      return 3;
    case 'group':
      return 0;
    default:
      return 0;
  }
}
