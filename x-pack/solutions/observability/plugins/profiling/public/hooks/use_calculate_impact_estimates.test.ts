/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { useCalculateImpactEstimate } from './use_calculate_impact_estimates';
import { useProfilingDependencies } from '../components/contexts/profiling_dependencies/use_profiling_dependencies';
import {
  profilingCo2PerKWH,
  profilingDatacenterPUE,
  profilingPervCPUWattX86,
} from '@kbn/observability-plugin/common';

jest.mock('../components/contexts/profiling_dependencies/use_profiling_dependencies');

describe('useCalculateImpactEstimate', () => {
  beforeAll(() => {
    (useProfilingDependencies as jest.Mock).mockReturnValue({
      start: {
        core: {
          uiSettings: {
            get: (key: string) => {
              if (key === profilingPervCPUWattX86) {
                return 7;
              }
              if (key === profilingCo2PerKWH) {
                return 0.000379069;
              }
              if (key === profilingDatacenterPUE) {
                return 1.7;
              }
            },
          },
        },
      },
    });
  });

  it('calculates impact when countExclusive is lower than countInclusive', () => {
    const calculateImpactEstimates = useCalculateImpactEstimate();
    const { selfCPU, totalCPU, totalSamples } = calculateImpactEstimates({
      countExclusive: 475,
      countInclusive: 950,
      totalSamples: 9500,
      totalSeconds: 15 * 60, // 15m
    });

    expect(totalCPU).toEqual({
      percentage: 0.1,
      coreSeconds: 50,
      annualizedCoreSeconds: 1752000,
    });

    expect(selfCPU).toEqual({
      percentage: 0.05,
      coreSeconds: 25,
      annualizedCoreSeconds: 876000,
    });

    expect(totalSamples).toEqual({
      percentage: 1,
      coreSeconds: 500,
      annualizedCoreSeconds: 17520000,
    });
  });

  it('calculates impact', () => {
    const calculateImpactEstimates = useCalculateImpactEstimate();
    const { selfCPU, totalCPU, totalSamples } = calculateImpactEstimates({
      countExclusive: 950,
      countInclusive: 950,
      totalSamples: 9500,
      totalSeconds: 15 * 60, // 15m
    });

    expect(totalCPU).toEqual({
      percentage: 0.1,
      coreSeconds: 50,
      annualizedCoreSeconds: 1752000,
    });

    expect(selfCPU).toEqual({
      percentage: 0.1,
      coreSeconds: 50,
      annualizedCoreSeconds: 1752000,
    });

    expect(totalSamples).toEqual({
      percentage: 1,
      coreSeconds: 500,
      annualizedCoreSeconds: 17520000,
    });
  });

  it('handles division by zero when totalSamples is 0', () => {
    const calculateImpactEstimates = useCalculateImpactEstimate();
    const { selfCPU, totalCPU, totalSamples } = calculateImpactEstimates({
      countExclusive: 100,
      countInclusive: 200,
      totalSamples: 0,
      totalSeconds: 15 * 60, // 15m
    });

    expect(totalCPU).toEqual({
      percentage: 0,
      coreSeconds: 0,
      annualizedCoreSeconds: 0,
    });

    expect(selfCPU).toEqual({
      percentage: 0,
      coreSeconds: 0,
      annualizedCoreSeconds: 0,
    });

    expect(totalSamples).toEqual({
      percentage: 0,
      coreSeconds: 0,
      annualizedCoreSeconds: 0,
    });
  });

  it('handles division by zero when totalSeconds is 0', () => {
    const calculateImpactEstimates = useCalculateImpactEstimate();
    const { selfCPU, totalCPU, totalSamples } = calculateImpactEstimates({
      countExclusive: 100,
      countInclusive: 200,
      totalSamples: 9500,
      totalSeconds: 0,
    });

    expect(totalCPU).toEqual({
      percentage: 0,
      coreSeconds: 0,
      annualizedCoreSeconds: 0,
    });

    expect(selfCPU).toEqual({
      percentage: 0,
      coreSeconds: 0,
      annualizedCoreSeconds: 0,
    });

    expect(totalSamples).toEqual({
      percentage: 0,
      coreSeconds: 0,
      annualizedCoreSeconds: 0,
    });
  });

  it('handles division by zero when both totalSamples and totalSeconds are 0', () => {
    const calculateImpactEstimates = useCalculateImpactEstimate();
    const { selfCPU, totalCPU, totalSamples } = calculateImpactEstimates({
      countExclusive: 100,
      countInclusive: 200,
      totalSamples: 0,
      totalSeconds: 0,
    });

    expect(totalCPU).toEqual({
      percentage: 0,
      coreSeconds: 0,
      annualizedCoreSeconds: 0,
    });

    expect(selfCPU).toEqual({
      percentage: 0,
      coreSeconds: 0,
      annualizedCoreSeconds: 0,
    });

    expect(totalSamples).toEqual({
      percentage: 0,
      coreSeconds: 0,
      annualizedCoreSeconds: 0,
    });
  });

  it('handles zero samples with non-zero totalSamples', () => {
    const calculateImpactEstimates = useCalculateImpactEstimate();
    const { selfCPU, totalCPU } = calculateImpactEstimates({
      countExclusive: 0,
      countInclusive: 0,
      totalSamples: 9500,
      totalSeconds: 15 * 60, // 15m
    });

    expect(totalCPU).toEqual({
      percentage: 0,
      coreSeconds: 0,
      annualizedCoreSeconds: 0,
    });

    expect(selfCPU).toEqual({
      percentage: 0,
      coreSeconds: 0,
      annualizedCoreSeconds: 0,
    });
  });
});
