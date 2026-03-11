/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { shallowEqual, useSelector } from 'react-redux';
import deepEqual from 'fast-deep-equal';

export type TypedUseSelectorHook = <TSelected, TState extends Record<string, unknown>>(
  selector: (state: TState) => TSelected,
  equalityFn?: (left: TSelected, right: TSelected) => boolean
) => TSelected;

export const useShallowEqualSelector: TypedUseSelectorHook = (selector) =>
  useSelector(selector, shallowEqual);

export const useDeepEqualSelector: TypedUseSelectorHook = (selector) =>
  useSelector(selector, deepEqual);
