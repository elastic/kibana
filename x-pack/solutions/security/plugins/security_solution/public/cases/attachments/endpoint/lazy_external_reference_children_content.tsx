/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { lazy, Suspense } from 'react';
import type { IExternalReferenceMetaDataProps } from './types';

const AttachmentContent = lazy(() => import('./external_reference_children'));

export const getLazyExternalChildrenContent = (props: IExternalReferenceMetaDataProps) => {
  return (
    <Suspense fallback={null}>
      <AttachmentContent {...props} />
    </Suspense>
  );
};
