/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import type { ApplicationStart, IUiSettingsClient, NotificationsStart } from '@kbn/core/public';
import { type CoreStart } from '@kbn/core/public';
import type { DefaultEmbeddableApi } from '@kbn/embeddable-plugin/public';
import type {
  PublishesTitle,
  PublishesWritableTitle,
  SerializedTitles,
} from '@kbn/presentation-publishing';
import type { Subject } from 'rxjs';

export interface EmbeddableProps {
  sloId: string;
  sloInstanceId: string;
  duration: string;
  reloadSubject?: Subject<boolean>;
}

export interface BurnRateCustomInput {
  sloId: string;
  sloInstanceId: string;
  duration: string;
}

export type SloBurnRateEmbeddableState = SerializedTitles & BurnRateCustomInput;
export type BurnRateApi = DefaultEmbeddableApi<SloBurnRateEmbeddableState> &
  PublishesWritableTitle &
  PublishesTitle;

export interface SloEmbeddableDeps {
  uiSettings: IUiSettingsClient;
  http: CoreStart['http'];
  i18n: CoreStart['i18n'];
  application: ApplicationStart;
  notifications: NotificationsStart;
}
