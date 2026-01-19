/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';

export const ARE_YOU_SURE = i18n.translate(
  'xpack.securitySolution.attackDiscovery.schedule.confirmationModal.areYouSureModalBody',
  {
    defaultMessage: 'Are you sure you want to discard them?',
  }
);

export const CANCEL = i18n.translate(
  'xpack.securitySolution.attackDiscovery.schedule.confirmationModal.cancelButton',
  {
    defaultMessage: 'Cancel',
  }
);

export const DISCARD_CHANGES = i18n.translate(
  'xpack.securitySolution.attackDiscovery.schedule.confirmationModal.discardChangesButton',
  {
    defaultMessage: 'Discard changes',
  }
);

export const DISCARD_UNSAVED_CHANGES = i18n.translate(
  'xpack.securitySolution.attackDiscovery.schedule.confirmationModal.discardUnsavedChangesTitle',
  {
    defaultMessage: 'Discard unsaved changes?',
  }
);
export const YOU_MADE_CHANGES = i18n.translate(
  'xpack.securitySolution.attackDiscovery.schedule.youMadeChangesModalBody',
  {
    defaultMessage:
      "You've made changes to your schedule that haven't been saved. If you leave now, those changes will be lost.",
  }
);
