/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { EcsSecurityExtension as Ecs } from '@kbn/securitysolution-ecs';
import type { RowRendererId } from '../../../api/timeline';

export interface RowRenderer {
  id: RowRendererId;
  isInstance: (data: Ecs) => boolean;
  renderRow: ({
    contextId,
    data,
    scopeId,
  }: {
    contextId?: string;
    data: Ecs;
    scopeId: string;
  }) => React.ReactNode;
}
