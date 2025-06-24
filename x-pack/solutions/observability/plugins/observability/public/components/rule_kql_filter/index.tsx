/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { lazy, Suspense } from 'react';
import type { WithKueryAutocompletionLifecycleProps } from './with_kuery_autocompletion';
import type { AutocompleteFieldProps } from './autocomplete_field';
import type { RuleFlyoutKueryBarProps } from './kuery_bar';

const RuleFlyoutKueryBarLazy = lazy(() => import('./kuery_bar'));

export function RuleFlyoutKueryBar(props: RuleFlyoutKueryBarProps) {
  return (
    <Suspense fallback={null}>
      <RuleFlyoutKueryBarLazy {...props} />
    </Suspense>
  );
}

const AutocompleteFieldLazy = lazy(() => import('./autocomplete_field/autocomplete_field'));

export function AutocompleteField(props: AutocompleteFieldProps) {
  return (
    <Suspense fallback={null}>
      <AutocompleteFieldLazy {...props} />
    </Suspense>
  );
}

const WithKueryAutocompletionLazy = lazy(() => import('./with_kuery_autocompletion'));

export function WithKueryAutocompletion(props: WithKueryAutocompletionLifecycleProps) {
  return (
    <Suspense fallback={null}>
      <WithKueryAutocompletionLazy {...props} />
    </Suspense>
  );
}
