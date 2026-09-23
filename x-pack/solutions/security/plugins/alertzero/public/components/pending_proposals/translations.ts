/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';

export const DISMISS = i18n.translate('xpack.alertzero.pendingProposals.dismiss', {
  defaultMessage: 'Dismiss',
});

export const CLOSE_INVESTIGATION_MODAL_TITLE = i18n.translate(
  'xpack.alertzero.pendingProposals.dismissModalTitle',
  {
    defaultMessage: 'Close the investigation?',
  }
);

export const DISMISS_RATIONALE_PLACEHOLDER = i18n.translate(
  'xpack.alertzero.pendingProposals.dismissRationalePlaceholder',
  { defaultMessage: 'Why is this proposal being dismissed?' }
);

export const DISMISS_REASON_LABEL = i18n.translate(
  'xpack.alertzero.pendingProposals.dismissReasonLabel',
  { defaultMessage: 'Reason' }
);
