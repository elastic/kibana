/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * Validation failure messages shared by the io-ts codecs and their zod twins.
 *
 * These strings reach users through the API error `details` field, so both
 * implementations must emit them byte-identically while the two libraries run
 * side by side during the zod migration.
 */

import { i18n } from '@kbn/i18n';
import { ConfigKey } from '../constants/monitor_management';

export const invalidNamespaceMessage = (error: string | undefined) =>
  i18n.translate('xpack.synthetics.namespaceValidation.error', {
    defaultMessage: 'Invalid namespace: {error}',
    values: { error },
  });

export const inlineScriptIsFullJourneyMessage = () =>
  i18n.translate('xpack.synthetics.monitorConfig.monitorScript.invalid.type', {
    defaultMessage:
      '{keyName}: Monitor script is invalid. Inline scripts cannot be full journey scripts, they may only contain step definitions.',
    values: { keyName: ConfigKey.SOURCE_INLINE },
  });

export const inlineScriptMissingStepMessage = () =>
  i18n.translate('xpack.synthetics.monitorConfig.monitorScript.invalid.oneStep.type', {
    defaultMessage:
      '{keyName}: Monitor script is invalid. Inline scripts must contain at least one step definition.',
    values: { keyName: ConfigKey.SOURCE_INLINE },
  });

export const inlineScriptNotAStringMessage = () =>
  `${ConfigKey.SOURCE_INLINE}: Inline script must be a non-empty string`;

export const nonEmptyFieldMessage = (fieldName: string) =>
  `Invalid field "${fieldName}", must be a non-empty string.`;
