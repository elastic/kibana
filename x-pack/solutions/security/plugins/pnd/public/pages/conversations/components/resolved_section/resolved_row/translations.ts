/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';

/** What clicking a resolved row opens. The label names the row, since every row carries one. */
export const openLifecycleAriaLabel = (title: string): string =>
  i18n.translate('xpack.pnd.brief.resolvedRow.openLifecycleAriaLabel', {
    defaultMessage: 'Open the lifecycle for {title}',
    values: { title },
  });

/**
 * Why a resolved row is not clickable. Same wording as the queue's rows, because it is the same
 * limit: with no correlated discovery there is no lifecycle to open.
 */
export const UNCORRELATED = i18n.translate('xpack.pnd.brief.resolvedRow.uncorrelated', {
  defaultMessage: 'Not correlated to an attack discovery, so there is no lifecycle to open.',
});
