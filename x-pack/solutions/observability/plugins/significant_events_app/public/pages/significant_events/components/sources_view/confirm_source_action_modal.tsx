/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiConfirmModal, useGeneratedHtmlId } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import type { NightshiftSource } from '@kbn/nightshift-shared';
import React from 'react';

/** Destructive row actions that ask for confirmation first. */
export type SourceAction = 'delete';

/** What the modal confirms: a row action, or saving a new query from the source flyout. */
type ConfirmedSourceAction = SourceAction | 'changeQuery';

const ACTION_COPY: Record<
  ConfirmedSourceAction,
  {
    getTitle: (title: string) => string;
    body: string;
    confirmLabel: string;
  }
> = {
  delete: {
    getTitle: (title) =>
      i18n.translate('xpack.significantEventsApp.sources.deleteModal.title', {
        defaultMessage: 'Delete "{title}"?',
        values: { title },
      }),
    body: i18n.translate('xpack.significantEventsApp.sources.deleteModal.body', {
      defaultMessage:
        'The source, its knowledge indicators and its rules are deleted. Detections and significant events already found are kept.',
    }),
    confirmLabel: i18n.translate('xpack.significantEventsApp.sources.deleteModal.confirm', {
      defaultMessage: 'Delete source',
    }),
  },
  changeQuery: {
    getTitle: (title) =>
      i18n.translate('xpack.significantEventsApp.sources.changeQueryModal.title', {
        defaultMessage: 'Save the new query of "{title}"?',
        values: { title },
      }),
    body: i18n.translate('xpack.significantEventsApp.sources.changeQueryModal.body', {
      defaultMessage:
        'Its knowledge indicators and rules describe the old query, so they are deleted and any running onboarding is stopped. Onboard the source again to rebuild them.',
    }),
    confirmLabel: i18n.translate('xpack.significantEventsApp.sources.changeQueryModal.confirm', {
      defaultMessage: 'Save and reset knowledge',
    }),
  },
};

const CANCEL_LABEL = i18n.translate('xpack.significantEventsApp.sources.confirmModal.cancel', {
  defaultMessage: 'Cancel',
});

interface ConfirmSourceActionModalProps {
  action: ConfirmedSourceAction;
  source: NightshiftSource;
  isLoading: boolean;
  onCancel: () => void;
  onConfirm: () => void;
}

export function ConfirmSourceActionModal({
  action,
  source,
  isLoading,
  onCancel,
  onConfirm,
}: ConfirmSourceActionModalProps) {
  const titleId = useGeneratedHtmlId();
  const { getTitle, body, confirmLabel } = ACTION_COPY[action];

  return (
    <EuiConfirmModal
      data-test-subj={`significantEventsAppSources-${action}-confirmModal`}
      aria-labelledby={titleId}
      titleProps={{ id: titleId }}
      title={getTitle(source.title)}
      onCancel={onCancel}
      onConfirm={onConfirm}
      cancelButtonText={CANCEL_LABEL}
      confirmButtonText={confirmLabel}
      buttonColor="danger"
      defaultFocusedButton="cancel"
      isLoading={isLoading}
    >
      <p>{body}</p>
    </EuiConfirmModal>
  );
}
