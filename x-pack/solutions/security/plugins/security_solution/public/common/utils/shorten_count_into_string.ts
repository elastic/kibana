/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export const shortenCountIntoString = (count: number): string => {
  if (count < 10000) {
    return count.toString();
  }
  const abbreviations = [
    { magnitude: 1e18, unit: 'E' },
    { magnitude: 1e15, unit: 'P' },
    { magnitude: 1e12, unit: 'T' },
    { magnitude: 1e9, unit: 'B' },
    { magnitude: 1e6, unit: 'M' },
    { magnitude: 1e3, unit: 'K' },
  ];
  const { magnitude, unit } = abbreviations.find(
    (abbreviation) => count >= abbreviation.magnitude
  ) ?? {
    magnitude: 1,
    unit: '',
  };

  return (
    toFixedWithoutRounding(count / magnitude, 1).replace(/\.0+$|(\.[0-9]*[1-9])0+$/, '$1') + unit
  );
};

const toFixedWithoutRounding = (n: number, p: number) => {
  const result = n.toFixed(p);
  return +result <= n ? result : (+result - Math.pow(0.1, p)).toFixed(p);
};
