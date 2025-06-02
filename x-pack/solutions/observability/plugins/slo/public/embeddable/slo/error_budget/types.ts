/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import {
  SerializedTitles,
  PublishesWritableTitle,
  PublishesTitle,
} from '@kbn/presentation-publishing';
import { DefaultEmbeddableApi } from '@kbn/embeddable-plugin/public';
import { Subject } from 'rxjs';
import {
  type CoreStart,
  IUiSettingsClient,
  ApplicationStart,
  NotificationsStart,
} from '@kbn/core/public';

export interface EmbeddableSloProps {
  sloId: string | undefined;
  sloInstanceId: string | undefined;
  reloadSubject?: Subject<boolean>;
  onRenderComplete?: () => void;
}

export interface ErrorBudgetCustomInput {
  sloId: string | undefined;
  sloInstanceId: string | undefined;
}

export type SloErrorBudgetEmbeddableState = SerializedTitles & ErrorBudgetCustomInput;
export type ErrorBudgetApi = DefaultEmbeddableApi<SloErrorBudgetEmbeddableState> &
  PublishesWritableTitle &
  PublishesTitle;

export interface SloEmbeddableDeps {
  uiSettings: IUiSettingsClient;
  http: CoreStart['http'];
  i18n: CoreStart['i18n'];
  application: ApplicationStart;
  notifications: NotificationsStart;
}
