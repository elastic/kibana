/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  ApplicationStart,
  CoreStart,
  IUiSettingsClient,
  NotificationsStart,
} from '@kbn/core/public';
import { ObservabilityPublicStart } from '@kbn/observability-plugin/public';
import { ObservabilitySharedPluginStart } from '@kbn/observability-shared-plugin/public';
import { UiActionsStart } from '@kbn/ui-actions-plugin/public';
import type { SLORepositoryClient } from '../../types';

export interface SLOEmbeddableDeps {
  uiSettings: IUiSettingsClient;
  http: CoreStart['http'];
  i18n: CoreStart['i18n'];
  theme: CoreStart['theme'];
  application: ApplicationStart;
  notifications: NotificationsStart;
  observability: ObservabilityPublicStart;
  observabilityShared: ObservabilitySharedPluginStart;
  uiActions: UiActionsStart;
  sloClient: SLORepositoryClient;
}
