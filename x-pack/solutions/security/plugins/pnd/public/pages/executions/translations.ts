/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';

export const PAGE_TITLE = i18n.translate('xpack.pnd.executions.pageTitle', {
  defaultMessage: 'Lifecycle',
});

export const PAGE_SUBTITLE = i18n.translate('xpack.pnd.executions.pageSubtitle', {
  defaultMessage: 'Four phases, end to end',
});

export const subtitleForAlert = (correlationId: string): string =>
  i18n.translate('xpack.pnd.executions.subtitleForAlert', {
    defaultMessage: 'Four phases, end to end · attack discovery {correlationId}',
    values: { correlationId },
  });
