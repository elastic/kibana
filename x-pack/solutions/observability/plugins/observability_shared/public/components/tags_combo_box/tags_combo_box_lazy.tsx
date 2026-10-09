/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { lazy, Suspense } from 'react';
import { EuiLoadingSpinner } from '@elastic/eui';
import type { TagsComboBoxProps } from './tags_combo_box';

const TagsComboBoxLazy = lazy(() => import('./tags_combo_box'));

export function TagsComboBox(props: TagsComboBoxProps) {
  return (
    <Suspense fallback={<EuiLoadingSpinner />}>
      <TagsComboBoxLazy {...props} />
    </Suspense>
  );
}
