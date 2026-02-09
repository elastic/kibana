/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { lazy, Suspense } from 'react';
import type { DatePickerProps } from './date_picker';

const DatePickerLazy = lazy(() => import('./date_picker'));

export function DatePicker(props: DatePickerProps) {
  return (
    <Suspense fallback={null}>
      <DatePickerLazy {...props} />
    </Suspense>
  );
}
