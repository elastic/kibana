/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { lazy, Suspense } from 'react';
import { EuiLoadingSpinner } from '@elastic/eui';
import type { AddPageAttachmentToCaseModalProps } from './add_page_attachment_to_case_modal';

const AddPageAttachmentToCaseModalLazy = lazy(() => import('./add_page_attachment_to_case_modal'));

export function AddPageAttachmentToCaseModal(props: AddPageAttachmentToCaseModalProps) {
  return (
    <Suspense fallback={<EuiLoadingSpinner />}>
      <AddPageAttachmentToCaseModalLazy {...props} />
    </Suspense>
  );
}
