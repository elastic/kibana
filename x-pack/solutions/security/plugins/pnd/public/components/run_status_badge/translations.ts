/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';

export const CANCELLED_LABEL = i18n.translate('xpack.pnd.runStatus.cancelledLabel', {
  defaultMessage: 'Cancelled',
});

export const CANCELLED_DESCRIPTION = i18n.translate('xpack.pnd.runStatus.cancelledDescription', {
  defaultMessage: 'The run was cancelled before it finished.',
});

export const FAILED_LABEL = i18n.translate('xpack.pnd.runStatus.failedLabel', {
  defaultMessage: 'Failed',
});

export const FAILED_DESCRIPTION = i18n.translate('xpack.pnd.runStatus.failedDescription', {
  defaultMessage: 'The run stopped on an error.',
});

export const RUNNING_LABEL = i18n.translate('xpack.pnd.runStatus.runningLabel', {
  defaultMessage: 'Running',
});

export const RUNNING_DESCRIPTION = i18n.translate('xpack.pnd.runStatus.runningDescription', {
  defaultMessage: 'The run is executing right now.',
});

export const SUCCEEDED_LABEL = i18n.translate('xpack.pnd.runStatus.succeededLabel', {
  defaultMessage: 'Succeeded',
});

export const SUCCEEDED_DESCRIPTION = i18n.translate('xpack.pnd.runStatus.succeededDescription', {
  defaultMessage: 'The run finished successfully.',
});

export const TIMED_OUT_LABEL = i18n.translate('xpack.pnd.runStatus.timedOutLabel', {
  defaultMessage: 'Timed out',
});

export const TIMED_OUT_DESCRIPTION = i18n.translate('xpack.pnd.runStatus.timedOutDescription', {
  defaultMessage: 'The run exceeded its time budget and was stopped.',
});

export const WAITING_FOR_INPUT_LABEL = i18n.translate('xpack.pnd.runStatus.waitingForInputLabel', {
  defaultMessage: 'Waiting for input',
});

export const WAITING_FOR_INPUT_DESCRIPTION = i18n.translate(
  'xpack.pnd.runStatus.waitingForInputDescription',
  {
    defaultMessage: 'The run is paused at a gate, waiting for an analyst decision.',
  }
);

export const UNKNOWN_LABEL = i18n.translate('xpack.pnd.runStatus.unknownLabel', {
  defaultMessage: 'Unknown status',
});

export const unknownDescription = (status: string): string =>
  i18n.translate('xpack.pnd.runStatus.unknownDescription', {
    defaultMessage:
      'The server reported the status "{status}", which this version of the UI does not recognize.',
    values: { status },
  });
