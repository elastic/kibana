/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import type { EngineComponentStatus, EngineStatus } from '@kbn/entity-store/common';

export const isEngineLoading = (status: EngineStatus | undefined) =>
  status === 'updating' || status === 'installing';

const LAST_TASK_ERROR_TITLE = i18n.translate(
  'xpack.securitySolution.entityAnalytics.entityStore.enginesStatus.lastTaskErrorTitle',
  { defaultMessage: 'Last task error' }
);

/** Errors to show for a component. Task components report their last run error as `lastError`. */
export const getComponentErrors = ({
  errors = [],
  lastError,
}: EngineComponentStatus): NonNullable<EngineComponentStatus['errors']> =>
  lastError ? [...errors, { title: LAST_TASK_ERROR_TITLE, message: lastError }] : errors;
