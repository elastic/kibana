/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';

/** Accessible name of the copy action on an indicator badge, inline and in the flyout. */
export const copyValueAriaLabel = (value: string): string =>
  i18n.translate('xpack.securitySolution.agentBuilder.investigationIocs.copyValueAriaLabel', {
    defaultMessage: 'Copy {value}',
    values: { value },
  });
