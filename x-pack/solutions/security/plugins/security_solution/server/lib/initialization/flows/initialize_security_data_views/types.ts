/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { DataViewsService } from '@kbn/data-views-plugin/common';
import type { IRuleDataService } from '@kbn/rule-registry-plugin/server';
import type { IUiSettingsClient } from '@kbn/core/server';

export interface InitializeSecurityDataViewsProvisionContext {
  dataViewsService: DataViewsService;
  ruleDataService: IRuleDataService;
  spaceId: string;
  uiSettingsClient: IUiSettingsClient;
  enableAttackDataView: boolean;
}
