/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { FieldPath, FieldPathValues } from 'react-hook-form';
import { useFormContext, useWatch } from 'react-hook-form';
import type { CreateSLOForm } from '../types';

/**
 * Subscribes the calling component to the given fields and returns their current values.
 *
 * `useWatch` is used only as the re-render trigger; the values are read with `getValues` so that they are
 * never stale: `useWatch` keeps its own snapshot, which misses a `setValue` made by a child effect during the
 * first mount (react-hook-form re-renders the root instead, before `_state.mount` is set) and keeps the previous
 * row's values for one render when a field-array index shifts after `remove()`.
 */
export const useFormValues = <TNames extends FieldPath<CreateSLOForm>[]>(
  names: readonly [...TNames]
): FieldPathValues<CreateSLOForm, TNames> => {
  const { control, getValues } = useFormContext<CreateSLOForm>();
  useWatch({ control, name: names });
  return getValues(names);
};
