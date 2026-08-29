/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';

export const SUCCEEDED_LABEL = i18n.translate('xpack.pnd.containmentActionStatus.succeededLabel', {
  defaultMessage: 'Succeeded',
});

export const SUCCEEDED_DESCRIPTION = i18n.translate(
  'xpack.pnd.containmentActionStatus.succeededDescription',
  {
    defaultMessage: 'The action executed and the target system reported success.',
  }
);

export const SUBMITTED_LABEL = i18n.translate('xpack.pnd.containmentActionStatus.submittedLabel', {
  defaultMessage: 'Submitted',
});

export const SUBMITTED_DESCRIPTION = i18n.translate(
  'xpack.pnd.containmentActionStatus.submittedDescription',
  {
    defaultMessage: 'The target system accepted the action and completes it on its own schedule.',
  }
);

export const FAILED_LABEL = i18n.translate('xpack.pnd.containmentActionStatus.failedLabel', {
  defaultMessage: 'Failed',
});

export const FAILED_DESCRIPTION = i18n.translate(
  'xpack.pnd.containmentActionStatus.failedDescription',
  {
    defaultMessage: 'The action was attempted and failed; the error on the row says how.',
  }
);

export const SKIPPED_LABEL = i18n.translate('xpack.pnd.containmentActionStatus.skippedLabel', {
  defaultMessage: 'Skipped',
});

export const SKIPPED_DESCRIPTION = i18n.translate(
  'xpack.pnd.containmentActionStatus.skippedDescription',
  {
    defaultMessage: 'The action was skipped before execution; the reason on the row says why.',
  }
);

export const NOT_EXECUTED_LABEL = i18n.translate(
  'xpack.pnd.containmentActionStatus.notExecutedLabel',
  {
    defaultMessage: 'Not executed',
  }
);

export const NOT_EXECUTED_DESCRIPTION = i18n.translate(
  'xpack.pnd.containmentActionStatus.notExecutedDescription',
  {
    defaultMessage:
      'The action was never executed, typically because it was not approved at the containment gate.',
  }
);

export const UNKNOWN_LABEL = i18n.translate('xpack.pnd.containmentActionStatus.unknownLabel', {
  defaultMessage: 'Unknown',
});

export const unknownDescription = (status: string): string =>
  i18n.translate('xpack.pnd.containmentActionStatus.unknownDescription', {
    defaultMessage: 'The ledger recorded a status this UI does not recognize: {status}.',
    values: { status },
  });
