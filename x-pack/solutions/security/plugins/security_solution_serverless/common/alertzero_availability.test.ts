/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { isAlertZeroAvailable } from './alertzero_availability';
import { ProductLine, ProductTier } from './product';

describe('AlertZero Security Complete entitlement', () => {
  it.each(
    Object.values(ProductLine).flatMap((productLine) =>
      Object.values(ProductTier).map((productTier) => ({ productLine, productTier }))
    )
  )('checks $productLine / $productTier', ({ productLine, productTier }) => {
    expect(isAlertZeroAvailable([{ product_line: productLine, product_tier: productTier }])).toBe(
      productLine === ProductLine.security && productTier === ProductTier.complete
    );
  });

  it('does not confuse an add-on Complete tier with Security Complete', () => {
    expect(
      isAlertZeroAvailable([
        { product_line: ProductLine.security, product_tier: ProductTier.essentials },
        { product_line: ProductLine.endpoint, product_tier: ProductTier.complete },
      ])
    ).toBe(false);
    expect(isAlertZeroAvailable([])).toBe(false);
  });
});
