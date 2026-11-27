/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { NodeKind } from '@kbn/cloud-security-posture-common/types/graph/latest';

export function getHandlePositionByKind(kind?: NodeKind) {
  switch (kind) {
    // A small inset (3 px) tucks the arrowhead tip just behind the card border so the base of
    // the arrow sits flush with the card edge instead of floating outside it.
    case 'entity':
    case 'event':
    case 'relationship':
      return 3;
    case 'connectorGroup':
      return 0;
    default:
      return 0;
  }
}
