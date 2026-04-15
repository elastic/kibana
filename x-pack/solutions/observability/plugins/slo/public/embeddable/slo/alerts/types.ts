/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import type { DefaultEmbeddableApi, HasDrilldowns } from '@kbn/embeddable-plugin/public';
import type { IUiSettingsClient, ApplicationStart, NotificationsStart } from '@kbn/core/public';
import { type CoreStart } from '@kbn/core/public';
import type { TriggersAndActionsUIPublicPluginStart } from '@kbn/triggers-actions-ui-plugin/public';
import type { DataPublicPluginStart } from '@kbn/data-plugin/public';
import type { SettingsStart } from '@kbn/core-ui-settings-browser';
import type { ChartsPluginStart } from '@kbn/charts-plugin/public';
import type { UiActionsStart } from '@kbn/ui-actions-plugin/public';
import type { ServerlessPluginStart } from '@kbn/serverless/public';
import type {
  PublishesWritableTitle,
  PublishesTitle,
  HasEditCapabilities,
} from '@kbn/presentation-publishing';
import type { HasSupportedTriggers } from '@kbn/presentation-publishing';
import type { ObservabilityPublicStart } from '@kbn/observability-plugin/public';
import type { CasesPublicStart } from '@kbn/cases-plugin/public';
import type { FieldFormatsStart } from '@kbn/field-formats-plugin/public';
import type { LicensingPluginStart } from '@kbn/licensing-plugin/public';
import type {
  AlertsCustomState,
  AlertsEmbeddableState,
} from '../../../../common/embeddables/alerts/types';

/** Re-exported from common (derived from server schema) */
export type {
  AlertsCustomState,
  AlertsEmbeddableState,
  SloItem,
} from '../../../../common/embeddables/alerts/types';

export type SloAlertsEmbeddableState = AlertsEmbeddableState;

export type SloAlertsApi = DefaultEmbeddableApi<AlertsEmbeddableState> &
  PublishesWritableTitle &
  PublishesTitle &
  HasDrilldowns &
  HasSupportedTriggers &
  HasSloAlertsConfig &
  HasEditCapabilities;

export interface HasSloAlertsConfig {
  getSloAlertsConfig: () => AlertsCustomState;
  updateSloAlertsConfig: (next: AlertsCustomState) => void;
}

export interface SloEmbeddableDeps {
  uiSettings: IUiSettingsClient;
  http: CoreStart['http'];
  i18n: CoreStart['i18n'];
  application: ApplicationStart;
  observability: ObservabilityPublicStart;
  triggersActionsUi: TriggersAndActionsUIPublicPluginStart;
  data: DataPublicPluginStart;
  notifications: NotificationsStart;
  settings: SettingsStart;
  charts: ChartsPluginStart;
  uiActions: UiActionsStart;
  serverless?: ServerlessPluginStart;
  cases?: CasesPublicStart;
  fieldFormats: FieldFormatsStart;
  licensing: LicensingPluginStart;
}
