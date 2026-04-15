/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { IUiSettingsClient } from '@kbn/core/server';
import { FF_ENABLE_ENTITY_STORE_V2 } from '../../../common';

export class FeatureFlags {
  constructor(private uiSettingsClient: IUiSettingsClient) {}

  public async isEntityStoreV2Enabled(): Promise<boolean> {
    return this.uiSettingsClient.get(FF_ENABLE_ENTITY_STORE_V2);
  }
}
