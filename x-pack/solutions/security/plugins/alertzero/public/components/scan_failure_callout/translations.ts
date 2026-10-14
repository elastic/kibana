/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';

export const SCAN_FAILURE_TITLE = i18n.translate('xpack.alertzero.scanFailure.title', {
  defaultMessage: "We couldn't fully scan your environment in the past 24 hours",
});

export const SCAN_FAILURE_BODY = i18n.translate('xpack.alertzero.scanFailure.body', {
  defaultMessage: 'These workers reported problems.',
});

export const SCAN_FAILURE_UNKNOWN = i18n.translate('xpack.alertzero.scanFailure.unknown', {
  defaultMessage: 'Another scan reported a problem.',
});
