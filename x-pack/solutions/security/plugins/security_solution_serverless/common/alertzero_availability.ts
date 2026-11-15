/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { SecurityProductTypes } from './config';
import { ProductLine, ProductTier } from './product';

/** AlertZero requires the Security product's Complete tier. */
export const isAlertZeroAvailable = (products: SecurityProductTypes): boolean =>
  products.some(
    ({ product_line: productLine, product_tier: productTier }) =>
      productLine === ProductLine.security && productTier === ProductTier.complete
  );
