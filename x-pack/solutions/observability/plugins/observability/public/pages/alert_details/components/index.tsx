/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { lazy, Suspense } from 'react';
import type { SourceBarProps } from './source_bar';

const SourceBarLazy = lazy(() => import('./source_bar'));

export function SourceBar(props: SourceBarProps) {
  return (
    <Suspense fallback={null}>
      <SourceBarLazy {...props} />
    </Suspense>
  );
}
