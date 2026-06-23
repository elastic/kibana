/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { memo, type ComponentType } from 'react';
import type { NodeProps } from '../types';
import { ZoomInvariantWrapper } from './zoom_invariant_wrapper';

export const withZoomInvariant = <P extends NodeProps>(
  Component: ComponentType<P>
): ComponentType<P> => {
  const Wrapped = memo((props: P) => (
    <ZoomInvariantWrapper>
      <Component {...props} />
    </ZoomInvariantWrapper>
  ));

  Wrapped.displayName = `ZoomInvariant(${Component.displayName ?? Component.name ?? 'Node'})`;

  return Wrapped as unknown as ComponentType<P>;
};
