/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

interface Params {
  countInclusive: number;
  countExclusive: number;
  totalSamples: number;
  totalSeconds: number;
}

export type CalculateImpactEstimates = ReturnType<typeof useCalculateImpactEstimate>;
export type ImpactEstimates = ReturnType<CalculateImpactEstimates>;

export const ANNUAL_SECONDS = 60 * 60 * 24 * 365;

export function useCalculateImpactEstimate() {
  function calculateImpact({
    samples,
    totalSamples,
    totalSeconds,
  }: {
    samples: number;
    totalSamples: number;
    totalSeconds: number;
  }) {
    if (totalSamples === 0 || totalSeconds === 0) {
      return {
        percentage: 0,
        coreSeconds: 0,
        annualizedCoreSeconds: 0,
      };
    }

    const annualizedScaleUp = ANNUAL_SECONDS / totalSeconds;
    const totalCoreSeconds = totalSamples / 19;
    const percentage = samples / totalSamples;
    const coreSeconds = totalCoreSeconds * percentage;
    const annualizedCoreSeconds = coreSeconds * annualizedScaleUp;

    return {
      percentage,
      coreSeconds,
      annualizedCoreSeconds,
    };
  }

  return (params: Params) => {
    return {
      totalSamples: calculateImpact({
        samples: params.totalSamples,
        totalSamples: params.totalSamples,
        totalSeconds: params.totalSeconds,
      }),
      totalCPU: calculateImpact({
        samples: params.countInclusive,
        totalSamples: params.totalSamples,
        totalSeconds: params.totalSeconds,
      }),
      selfCPU: calculateImpact({
        samples: params.countExclusive,
        totalSamples: params.totalSamples,
        totalSeconds: params.totalSeconds,
      }),
    };
  };
}
