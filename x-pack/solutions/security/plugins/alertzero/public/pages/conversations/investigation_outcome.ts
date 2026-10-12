/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import type { InvestigationQueueItem } from '../../../common/investigations/queue';

const CLOSE_REASON_LABELS: Record<string, string> = {
  false_positive: i18n.translate('xpack.alertzero.investigationOutcome.falsePositive', {
    defaultMessage: 'False positive',
  }),
  benign: i18n.translate('xpack.alertzero.investigationOutcome.benign', {
    defaultMessage: 'Benign',
  }),
  resolved: i18n.translate('xpack.alertzero.investigationOutcome.resolved', {
    defaultMessage: 'Resolved',
  }),
  duplicate: i18n.translate('xpack.alertzero.investigationOutcome.duplicate', {
    defaultMessage: 'Duplicate',
  }),
  other: i18n.translate('xpack.alertzero.investigationOutcome.other', {
    defaultMessage: 'Closed',
  }),
};

/** How a closed investigation was settled, `undefined` while it is still open or has no reason. */
export const investigationOutcome = ({
  status,
  closeReason,
}: Pick<InvestigationQueueItem, 'status' | 'closeReason'>): string | undefined =>
  status === 'closed' && closeReason ? CLOSE_REASON_LABELS[closeReason] : undefined;
