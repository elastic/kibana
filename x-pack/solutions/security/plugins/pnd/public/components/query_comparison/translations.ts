/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';

export const TITLE = i18n.translate('xpack.pnd.queryComparison.title', {
  defaultMessage: 'Rule query',
});

export const CURRENT = i18n.translate('xpack.pnd.queryComparison.currentLabel', {
  defaultMessage: 'As-is',
});

export const PROPOSED = i18n.translate('xpack.pnd.queryComparison.proposedLabel', {
  defaultMessage: 'As-proposed',
});

export const UNKNOWN_CURRENT_TITLE = i18n.translate(
  'xpack.pnd.queryComparison.unknownCurrentTitle',
  {
    defaultMessage: 'The rule query as it stands could not be read',
  }
);

export const UNKNOWN_CURRENT_BODY = i18n.translate('xpack.pnd.queryComparison.unknownCurrentBody', {
  defaultMessage:
    'Only the proposed query is shown below, so there is nothing to compare it against. Open the rule to read its current query before approving.',
});

export const IDENTICAL_TITLE = i18n.translate('xpack.pnd.queryComparison.identicalTitle', {
  defaultMessage: 'The proposed query is identical to the current one',
});

export const IDENTICAL_BODY = i18n.translate('xpack.pnd.queryComparison.identicalBody', {
  defaultMessage:
    'Approving this would rewrite the query to what it already is, which changes nothing about which documents the rule matches.',
});
