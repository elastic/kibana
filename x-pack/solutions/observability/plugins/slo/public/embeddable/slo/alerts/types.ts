/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { DefaultEmbeddableApi } from '@kbn/embeddable-plugin/public';
import {
  type CoreStart,
  IUiSettingsClient,
  ApplicationStart,
  NotificationsStart,
} from '@kbn/core/public';
import { TriggersAndActionsUIPublicPluginStart } from '@kbn/triggers-actions-ui-plugin/public';
import type { DataPublicPluginStart } from '@kbn/data-plugin/public';
import { SettingsStart } from '@kbn/core-ui-settings-browser';
import type { ChartsPluginStart } from '@kbn/charts-plugin/public';
import type { UiActionsStart } from '@kbn/ui-actions-plugin/public';
import { ServerlessPluginStart } from '@kbn/serverless/public';
import {
  SerializedTitles,
  PublishesWritableTitle,
  PublishesTitle,
  HasEditCapabilities,
} from '@kbn/presentation-publishing';
import { ObservabilityPublicStart } from '@kbn/observability-plugin/public';
import { CasesPublicStart } from '@kbn/cases-plugin/public';
import { FieldFormatsStart } from '@kbn/field-formats-plugin/public';
import { LicensingPluginStart } from '@kbn/licensing-plugin/public';

export interface SloItem {
  id: string;
  instanceId: string;
  name: string;
  groupBy: string;
}

export interface EmbeddableSloProps {
  slos: SloItem[];
  showAllGroupByInstances?: boolean;
}

export type SloAlertsEmbeddableState = SerializedTitles & EmbeddableSloProps;

export type SloAlertsApi = DefaultEmbeddableApi<SloAlertsEmbeddableState> &
  PublishesWritableTitle &
  PublishesTitle &
  HasSloAlertsConfig &
  HasEditCapabilities;

export interface HasSloAlertsConfig {
  getSloAlertsConfig: () => EmbeddableSloProps;
  updateSloAlertsConfig: (next: EmbeddableSloProps) => void;
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
