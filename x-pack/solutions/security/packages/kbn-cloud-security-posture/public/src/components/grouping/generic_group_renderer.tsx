/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import type { GroupRenderRegistry, GroupRenderContext } from './types';

export interface GenericGroupRendererProps<TGroup> {
  groupKey: string | null | undefined;
  context: GroupRenderContext<TGroup>;
  registry: GroupRenderRegistry<TGroup>;
}

export function GenericGroupRenderer<TGroup>({
  groupKey,
  context,
  registry,
}: GenericGroupRendererProps<TGroup>) {
  if (!groupKey) {
    return registry.nullGroup?.({ context }) ?? null;
  }

  const Renderer = registry.renderers[groupKey] ?? registry.defaultRenderer;
  return <Renderer context={context} />;
}
