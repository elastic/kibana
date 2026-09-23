/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';

export const ESCALATION_MODAL_TRANSLATIONS = Object.freeze({
  title: i18n.translate('xpack.alertzero.escalationModal.title', {
    defaultMessage: 'Escalate investigation',
  }),
  subtitle: (investigationTitle: string) =>
    i18n.translate('xpack.alertzero.escalationModal.subtitle', {
      defaultMessage:
        'Escalate "{investigationTitle}" into a new escalation, or link it to one that exists.',
      values: { investigationTitle },
    }),
  modes: {
    create: {
      label: i18n.translate('xpack.alertzero.escalationModal.modes.create.label', {
        defaultMessage: 'Create escalation',
      }),
      description: i18n.translate('xpack.alertzero.escalationModal.modes.create.description', {
        defaultMessage: 'New escalation, this investigation linked',
      }),
    },
    addToExisting: {
      label: i18n.translate('xpack.alertzero.escalationModal.modes.addToExisting.label', {
        defaultMessage: 'Add to existing',
      }),
      description: i18n.translate(
        'xpack.alertzero.escalationModal.modes.addToExisting.description',
        { defaultMessage: 'Link into an open escalation' }
      ),
    },
  },
  createForm: {
    titleLabel: i18n.translate('xpack.alertzero.escalationModal.createForm.titleLabel', {
      defaultMessage: 'Escalation title',
    }),
    titleHelpText: i18n.translate('xpack.alertzero.escalationModal.createForm.titleHelpText', {
      defaultMessage:
        'Inherited from the investigation — edit anytime. Metadata fills in automatically.',
    }),
    visibilityLabel: i18n.translate('xpack.alertzero.escalationModal.createForm.visibilityLabel', {
      defaultMessage: 'Visibility',
    }),
    publicLabel: i18n.translate('xpack.alertzero.escalationModal.createForm.publicLabel', {
      defaultMessage: 'Public',
    }),
    privateLabel: i18n.translate('xpack.alertzero.escalationModal.createForm.privateLabel', {
      defaultMessage: 'Private',
    }),
    whoHasAccessLabel: i18n.translate(
      'xpack.alertzero.escalationModal.createForm.whoHasAccessLabel',
      { defaultMessage: 'Who has access' }
    ),
    searchUsersPlaceholder: i18n.translate(
      'xpack.alertzero.escalationModal.createForm.searchUsersPlaceholder',
      { defaultMessage: 'Search users' }
    ),
    ownerLabel: i18n.translate('xpack.alertzero.escalationModal.createForm.ownerLabel', {
      defaultMessage: 'Owner',
    }),
    submitButton: i18n.translate('xpack.alertzero.escalationModal.createForm.submitButton', {
      defaultMessage: 'Open escalation',
    }),
  },
  addToExistingForm: {
    searchPlaceholder: i18n.translate(
      'xpack.alertzero.escalationModal.addToExistingForm.searchPlaceholder',
      { defaultMessage: 'Search escalations...' }
    ),
    accessNote: i18n.translate('xpack.alertzero.escalationModal.addToExistingForm.accessNote', {
      defaultMessage: 'Only escalations you own or participate in are shown.',
    }),
    linkedInvestigationsCount: (count: number) =>
      i18n.translate('xpack.alertzero.escalationModal.addToExistingForm.linkedCount', {
        defaultMessage:
          '{count, plural, one {# linked investigation} other {# linked investigations}}',
        values: { count },
      }),
    openBadge: i18n.translate('xpack.alertzero.escalationModal.addToExistingForm.openBadge', {
      defaultMessage: 'Open',
    }),
    submitButton: i18n.translate('xpack.alertzero.escalationModal.addToExistingForm.submitButton', {
      defaultMessage: 'Add to escalation',
    }),
    loadingText: i18n.translate('xpack.alertzero.escalationModal.addToExistingForm.loadingText', {
      defaultMessage: 'Loading escalations...',
    }),
    emptyText: i18n.translate('xpack.alertzero.escalationModal.addToExistingForm.emptyText', {
      defaultMessage: 'No escalations found.',
    }),
    alreadyLinkedTooltip: i18n.translate(
      'xpack.alertzero.escalationModal.addToExistingForm.alreadyLinkedTooltip',
      { defaultMessage: 'This investigation is already part of this escalation.' }
    ),
    notOwnerTooltip: i18n.translate(
      'xpack.alertzero.escalationModal.addToExistingForm.notOwnerTooltip',
      { defaultMessage: 'You can only add to escalations you own.' }
    ),
    loadErrorTitle: i18n.translate(
      'xpack.alertzero.escalationModal.addToExistingForm.loadErrorTitle',
      { defaultMessage: 'Failed to load escalations.' }
    ),
    retryButton: i18n.translate('xpack.alertzero.escalationModal.addToExistingForm.retryButton', {
      defaultMessage: 'Retry',
    }),
  },
  cancelButton: i18n.translate('xpack.alertzero.escalationModal.cancelButton', {
    defaultMessage: 'Cancel',
  }),
});

export const ESCALATION_SUCCESS = Object.freeze({
  createTitle: i18n.translate('xpack.alertzero.escalation.createSuccess.title', {
    defaultMessage: 'Escalation created',
  }),
  addToTitle: i18n.translate('xpack.alertzero.escalation.addToSuccess.title', {
    defaultMessage: 'Investigation added to escalation',
  }),
  linkText: i18n.translate('xpack.alertzero.escalation.success.linkText', {
    defaultMessage: 'View all escalations',
  }),
});

export const ESCALATION_ERRORS = Object.freeze({
  createFailed: i18n.translate('xpack.alertzero.escalation.createFailed', {
    defaultMessage: 'Failed to create the escalation. Try again.',
  }),
  addToFailed: i18n.translate('xpack.alertzero.escalation.addToFailed', {
    defaultMessage: 'Failed to add to the escalation. Try again.',
  }),
});
