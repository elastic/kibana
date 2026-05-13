/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ConfigType } from '../../config';
import {
  getDetectionEmulationFeatureFlags,
  getRealExecutionDisableReason,
  isRealExecutionEnabled,
  REAL_EXECUTION_DISABLE_REASON_TEXT,
} from './feature_flag';

const buildConfig = (overrides: {
  staticRealExecution: boolean;
  staticLogInjection?: boolean;
  runtimeRealExecutionEnabled?: boolean | undefined;
}): ConfigType =>
  ({
    experimentalFeatures: {
      detectionEmulationRealExecution: overrides.staticRealExecution,
      detectionEmulationLogInjection: overrides.staticLogInjection ?? false,
    },
    detectionEmulation:
      overrides.runtimeRealExecutionEnabled === undefined
        ? undefined
        : { realExecutionEnabled: overrides.runtimeRealExecutionEnabled },
  } as unknown as ConfigType);

describe('getDetectionEmulationFeatureFlags', () => {
  it('reads both the static feature flag and the runtime kill switch into separate fields', () => {
    const flags = getDetectionEmulationFeatureFlags(
      buildConfig({ staticRealExecution: true, runtimeRealExecutionEnabled: false })
    );

    expect(flags).toEqual({
      realExecution: true,
      realExecutionRuntimeEnabled: false,
      logInjection: false,
    });
  });

  it('defaults the runtime kill switch to true when `detectionEmulation` is omitted', () => {
    const flags = getDetectionEmulationFeatureFlags(
      buildConfig({ staticRealExecution: true, runtimeRealExecutionEnabled: undefined })
    );

    expect(flags.realExecutionRuntimeEnabled).toBe(true);
  });

  it('reads logInjection from the static feature-flag block', () => {
    const flags = getDetectionEmulationFeatureFlags(
      buildConfig({ staticRealExecution: false, staticLogInjection: true })
    );

    expect(flags.logInjection).toBe(true);
  });
});

describe('isRealExecutionEnabled', () => {
  it('returns true only when both the static flag AND the runtime kill switch are open', () => {
    const flags = getDetectionEmulationFeatureFlags(
      buildConfig({ staticRealExecution: true, runtimeRealExecutionEnabled: true })
    );
    expect(isRealExecutionEnabled(flags)).toBe(true);
  });

  it('returns false when the static feature flag is closed, even if runtime is open', () => {
    const flags = getDetectionEmulationFeatureFlags(
      buildConfig({ staticRealExecution: false, runtimeRealExecutionEnabled: true })
    );
    expect(isRealExecutionEnabled(flags)).toBe(false);
  });

  it('returns false when the runtime kill switch is closed, even if static is open', () => {
    const flags = getDetectionEmulationFeatureFlags(
      buildConfig({ staticRealExecution: true, runtimeRealExecutionEnabled: false })
    );
    expect(isRealExecutionEnabled(flags)).toBe(false);
  });

  it('returns false when both knobs are closed', () => {
    const flags = getDetectionEmulationFeatureFlags(
      buildConfig({ staticRealExecution: false, runtimeRealExecutionEnabled: false })
    );
    expect(isRealExecutionEnabled(flags)).toBe(false);
  });
});

describe('getRealExecutionDisableReason', () => {
  it('returns null when both knobs are open', () => {
    const flags = getDetectionEmulationFeatureFlags(
      buildConfig({ staticRealExecution: true, runtimeRealExecutionEnabled: true })
    );
    expect(getRealExecutionDisableReason(flags)).toBeNull();
  });

  it('returns `feature_flag_disabled` when the static flag is closed', () => {
    const flags = getDetectionEmulationFeatureFlags(
      buildConfig({ staticRealExecution: false, runtimeRealExecutionEnabled: true })
    );
    expect(getRealExecutionDisableReason(flags)).toBe('feature_flag_disabled');
  });

  it('returns `runtime_kill_switch_engaged` when only the runtime knob is closed', () => {
    const flags = getDetectionEmulationFeatureFlags(
      buildConfig({ staticRealExecution: true, runtimeRealExecutionEnabled: false })
    );
    expect(getRealExecutionDisableReason(flags)).toBe('runtime_kill_switch_engaged');
  });

  it('prefers the static-flag reason when both knobs are closed (operators must flip the static one first)', () => {
    const flags = getDetectionEmulationFeatureFlags(
      buildConfig({ staticRealExecution: false, runtimeRealExecutionEnabled: false })
    );
    expect(getRealExecutionDisableReason(flags)).toBe('feature_flag_disabled');
  });
});

describe('REAL_EXECUTION_DISABLE_REASON_TEXT', () => {
  it('exposes a human-readable message for every disable reason', () => {
    expect(REAL_EXECUTION_DISABLE_REASON_TEXT.feature_flag_disabled).toMatch(
      /detectionEmulationRealExecution/
    );
    expect(REAL_EXECUTION_DISABLE_REASON_TEXT.runtime_kill_switch_engaged).toMatch(
      /realExecutionEnabled/
    );
  });
});
