/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { lazy, Suspense } from 'react';
import { EuiLoadingSpinner } from '@elastic/eui';
import type { DatePickerProps } from './date_picker';
import type { FilterValueLabelProps } from './filter_value_label/filter_value_label';
import type { SelectableUrlListProps } from './exploratory_view/components/url_search/selectable_url_list';
import type { ExploratoryViewPageProps } from './exploratory_view';
export type { LazyObservabilityPageTemplateProps } from '@kbn/observability-shared-plugin/public';

const FilterValueLabelLazy = lazy(() => import('./filter_value_label/filter_value_label'));

export function FilterValueLabel(props: FilterValueLabelProps) {
  return (
    <Suspense fallback={null}>
      <FilterValueLabelLazy {...props} />
    </Suspense>
  );
}

const SelectableUrlListLazy = lazy(
  () => import('./exploratory_view/components/url_search/selectable_url_list')
);

export function SelectableUrlList(props: SelectableUrlListProps) {
  return (
    <Suspense fallback={null}>
      <SelectableUrlListLazy {...props} />
    </Suspense>
  );
}

const ExploratoryViewLazy = lazy(() => import('./exploratory_view'));

export function ExploratoryView(props: ExploratoryViewPageProps) {
  return (
    <Suspense fallback={null}>
      <ExploratoryViewLazy {...props} />
    </Suspense>
  );
}

const DatePickerLazy = lazy(() => import('./date_picker'));

export function DatePicker(props: DatePickerProps) {
  return (
    <Suspense fallback={<EuiLoadingSpinner />}>
      <DatePickerLazy {...props} />
    </Suspense>
  );
}
