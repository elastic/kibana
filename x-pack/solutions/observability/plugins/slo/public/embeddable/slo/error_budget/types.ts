/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import type { PublishesWritableTitle, PublishesTitle } from '@kbn/presentation-publishing';
import type { DefaultEmbeddableApi, HasDrilldowns } from '@kbn/embeddable-plugin/public';
import type { Subject } from 'rxjs';
import type { ErrorBudgetEmbeddableState } from '../../../../common/embeddables/error_budget/types';

export type {
  ErrorBudgetCustomState,
  ErrorBudgetEmbeddableState,
} from '../../../../common/embeddables/error_budget/types';

export interface EmbeddableSloProps {
  sloId: string | undefined;
  sloInstanceId: string | undefined;
  reloadSubject?: Subject<boolean>;
  onRenderComplete?: () => void;
}

export type ErrorBudgetApi = DefaultEmbeddableApi<ErrorBudgetEmbeddableState> &
  PublishesWritableTitle &
  PublishesTitle &
  HasDrilldowns;
