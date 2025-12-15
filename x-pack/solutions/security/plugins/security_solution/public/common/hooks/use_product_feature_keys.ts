/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useMemo } from 'react';
import useObservable from 'react-use/lib/useObservable';
import type { ProductFeatureKeyType } from '@kbn/security-solution-features/src/types';
import { useKibana } from '../lib/kibana';

/**
 * Hook to get the current product feature keys from the observable.
 *
 * @returns Set of product feature keys, or empty Set if not available
 */
export const useProductFeatureKeys = (): Set<ProductFeatureKeyType> => {
  const { productFeatureKeys$ } = useKibana().services;
  const productFeatureKeys = useObservable(productFeatureKeys$, null);
  return useMemo(() => productFeatureKeys ?? new Set(), [productFeatureKeys]);
};
