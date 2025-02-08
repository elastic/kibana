/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';

import type { EcsSecurityExtension as Ecs } from '@kbn/securitysolution-ecs';
import { EuiFlexGroup, EuiFlexItem } from '@elastic/eui';
import type { RowRenderer } from '../../../../../../../common/types';
import type { RowRendererId } from '../../../../../../../common/api/timeline';

export const combineRenderers = ({
  a,
  b,
  id,
}: {
  a: RowRenderer;
  b: RowRenderer;
  id: RowRendererId;
}): RowRenderer => ({
  id,
  isInstance: (data: Ecs) => a.isInstance(data) || b.isInstance(data),
  renderRow: ({ contextId, data, scopeId }: { contextId?: string; data: Ecs; scopeId: string }) => (
    <EuiFlexGroup direction="column" gutterSize="m">
      {a.isInstance(data) && (
        <EuiFlexItem> {a.renderRow({ contextId, data, scopeId })}</EuiFlexItem>
      )}
      {b.isInstance(data) && <EuiFlexItem>{b.renderRow({ contextId, data, scopeId })}</EuiFlexItem>}
    </EuiFlexGroup>
  ),
});
