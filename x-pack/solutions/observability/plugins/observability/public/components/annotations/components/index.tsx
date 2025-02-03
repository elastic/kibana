/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { lazy, Suspense } from 'react';
import type { ObservabilityAnnotationsProps } from './observability_annotation';

const ObservabilityAnnotationsLazy = lazy(() => import('./observability_annotation'));

export function ObservabilityAnnotations(props: ObservabilityAnnotationsProps) {
  return (
    <Suspense fallback={null}>
      <ObservabilityAnnotationsLazy {...props} />
    </Suspense>
  );
}

import type { CreateAnnotationProps } from './create_annotation';

const CreateAnnotationLazy = lazy(() => import('./create_annotation'));

export function CreateAnnotation(props: CreateAnnotationProps) {
  return (
    <Suspense fallback={null}>
      <CreateAnnotationLazy {...props} />
    </Suspense>
  );
}
