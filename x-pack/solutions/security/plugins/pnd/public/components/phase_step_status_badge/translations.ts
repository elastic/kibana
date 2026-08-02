/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';

export const COMPLETED_LABEL = i18n.translate('xpack.pnd.phaseStepStatus.completedLabel', {
  defaultMessage: 'Completed',
});

export const COMPLETED_DESCRIPTION = i18n.translate(
  'xpack.pnd.phaseStepStatus.completedDescription',
  {
    defaultMessage: 'This step ran and finished successfully.',
  }
);

export const FAILED_LABEL = i18n.translate('xpack.pnd.phaseStepStatus.failedLabel', {
  defaultMessage: 'Failed',
});

export const FAILED_DESCRIPTION = i18n.translate('xpack.pnd.phaseStepStatus.failedDescription', {
  defaultMessage: 'This step ran and did not finish.',
});

export const NOT_STARTED_LABEL = i18n.translate('xpack.pnd.phaseStepStatus.notStartedLabel', {
  defaultMessage: 'Not started',
});

export const NOT_STARTED_DESCRIPTION = i18n.translate(
  'xpack.pnd.phaseStepStatus.notStartedDescription',
  {
    defaultMessage: 'The run has not reached this step yet.',
  }
);

export const RUNNING_LABEL = i18n.translate('xpack.pnd.phaseStepStatus.runningLabel', {
  defaultMessage: 'Running',
});

export const RUNNING_DESCRIPTION = i18n.translate('xpack.pnd.phaseStepStatus.runningDescription', {
  defaultMessage: 'This step is executing right now.',
});

export const SKIPPED_LABEL = i18n.translate('xpack.pnd.phaseStepStatus.skippedLabel', {
  defaultMessage: 'Skipped',
});

export const SKIPPED_DESCRIPTION = i18n.translate('xpack.pnd.phaseStepStatus.skippedDescription', {
  defaultMessage: 'The workflow engine skipped or cancelled this step during the run.',
});

export const UPSTREAM_LABEL = i18n.translate('xpack.pnd.phaseStepStatus.upstreamLabel', {
  defaultMessage: 'Upstream',
});

export const UPSTREAM_DESCRIPTION = i18n.translate(
  'xpack.pnd.phaseStepStatus.upstreamDescription',
  {
    defaultMessage:
      'Attack Discovery and Elastic Security do this work before AlertZero is invoked, so AlertZero records no step of its own for it.',
  }
);

export const WAITING_FOR_INPUT_LABEL = i18n.translate(
  'xpack.pnd.phaseStepStatus.waitingForInputLabel',
  {
    defaultMessage: 'Waiting for input',
  }
);

export const WAITING_FOR_INPUT_DESCRIPTION = i18n.translate(
  'xpack.pnd.phaseStepStatus.waitingForInputDescription',
  {
    defaultMessage: 'This gate is waiting for an analyst decision.',
  }
);

export const UNKNOWN_LABEL = i18n.translate('xpack.pnd.phaseStepStatus.unknownLabel', {
  defaultMessage: 'Unknown status',
});

export const unknownDescription = (status: string): string =>
  i18n.translate('xpack.pnd.phaseStepStatus.unknownDescription', {
    defaultMessage:
      'The server reported the status "{status}", which this version of the UI does not recognize.',
    values: { status },
  });
