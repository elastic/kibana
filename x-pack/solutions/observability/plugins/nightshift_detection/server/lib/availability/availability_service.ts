/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { inject, injectable, optional } from 'inversify';
import { firstValueFrom } from 'rxjs';
import type { CoreStart as CoreStartContext } from '@kbn/core/server';
import type { CloudSetup } from '@kbn/cloud-plugin/server';
import { PluginSetup, PluginStart } from '@kbn/core-di';
import { CoreStart } from '@kbn/core-di-server';
import type { LicensingPluginStart } from '@kbn/licensing-plugin/server';
import { NIGHTSHIFT_ENABLED_FLAG } from '@kbn/nightshift-shared';
import { NIGHTSHIFT_DETECTION_TIERED_FEATURE } from '../../../common/constants';

/** Requirements in evaluation order; the first unmet one is the reason reported. */
export type TAvailabilityUnavailableReason =
  | 'feature_flag'
  | 'project_type'
  | 'pricing_tier'
  | 'license';

/**
 * Decides whether the detection engine may run on this deployment. Same requirements as
 * significant events, kept as an engine-owned service so the engine does not depend on that
 * plugin's server internals.
 */
@injectable()
export class AvailabilityService {
  constructor(
    @inject(CoreStart('featureFlags'))
    private readonly featureFlags: CoreStartContext['featureFlags'],
    @inject(CoreStart('pricing')) private readonly pricing: CoreStartContext['pricing'],
    @inject(PluginStart<LicensingPluginStart>('licensing'))
    private readonly licensing: LicensingPluginStart,
    @inject(PluginSetup<CloudSetup>('cloud'))
    @optional()
    private readonly cloud: CloudSetup | undefined
  ) {}

  /** True when every requirement is met. */
  public async isAvailable(): Promise<boolean> {
    return (await this.getUnavailableReason()) === undefined;
  }

  /** The first unmet requirement, or `undefined` when the engine is available. */
  public async getUnavailableReason(): Promise<TAvailabilityUnavailableReason | undefined> {
    if (!(await this.isFeatureFlagEnabled())) {
      return 'feature_flag';
    }

    if (!this.isObservabilityDeployment()) {
      return 'project_type';
    }

    if (!this.pricing.isFeatureAvailable(NIGHTSHIFT_DETECTION_TIERED_FEATURE.id)) {
      return 'pricing_tier';
    }

    if (!(await this.licensing.getLicense()).hasAtLeast('enterprise')) {
      return 'license';
    }

    return undefined;
  }

  private isFeatureFlagEnabled(): Promise<boolean> {
    // oxlint-disable-next-line @kbn/eslint/no_feature_flag_snapshot -- called on every tick, so each check reads the current flag value
    return firstValueFrom(this.featureFlags.getBooleanValue$(NIGHTSHIFT_ENABLED_FLAG, false));
  }

  /**
   * The pricing tier cannot express the project type: `isFeatureAvailable` is true wherever
   * `pricing.tiers.enabled` is false, which is every serverless project type except Observability.
   * Serverless always runs in cloud, so `isServerlessEnabled` is the classic vs serverless split.
   */
  private isObservabilityDeployment(): boolean {
    if (!this.cloud?.isServerlessEnabled) {
      return true;
    }

    return this.cloud.serverless.projectType === 'observability';
  }
}
