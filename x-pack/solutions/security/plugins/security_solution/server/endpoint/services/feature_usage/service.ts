/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Values } from '@kbn/utility-types';
import type { LicensingPluginSetup, LicensingPluginStart } from '@kbn/licensing-plugin/server';
import type { ResponseActionsApiCommandNames } from '../../../../common/endpoint/service/response_actions/constants';
import type { FeatureKeys } from './feature_keys';
import { getResponseActionFeatureKey, FEATURE_KEYS } from './feature_keys';

export class FeatureUsageService {
  private licensingPluginStart: LicensingPluginStart | undefined;

  private get notify(): (featureName: Values<typeof FEATURE_KEYS>) => void {
    return this.licensingPluginStart?.featureUsage.notifyUsage || function () {};
  }

  public setup(licensingPluginSetup: LicensingPluginSetup): void {
    Object.values(FEATURE_KEYS).map((featureValue) =>
      licensingPluginSetup.featureUsage.register(featureValue, 'platinum')
    );
  }

  public start(licensingPluginStart: LicensingPluginStart): void {
    this.licensingPluginStart = licensingPluginStart;
  }

  public notifyUsage(featureKey: FeatureKeys): void {
    this.notify(FEATURE_KEYS[featureKey]);
  }

  public getResponseActionFeatureKey(
    responseAction: ResponseActionsApiCommandNames
  ): FeatureKeys | undefined {
    return getResponseActionFeatureKey(responseAction);
  }
}
