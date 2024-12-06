/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EcsSecurityExtension as Ecs } from '@kbn/securitysolution-ecs';
import { DeprecatedRowRendererId } from '..';

/**
 * This interface should not be used anymore.
 * Use the one from `plugins/security_solution/common/types/timeline`.
 * @deprecated
 */
export interface DeprecatedRowRenderer {
  id: DeprecatedRowRendererId;
  isInstance: (data: Ecs) => boolean;
  renderRow: ({
    contextId,
    data,
    isDraggable,
    scopeId,
  }: {
    contextId?: string;
    data: Ecs;
    isDraggable: boolean;
    scopeId: string;
  }) => React.ReactNode;
}
