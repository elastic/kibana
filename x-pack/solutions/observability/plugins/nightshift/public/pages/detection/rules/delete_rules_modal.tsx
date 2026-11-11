/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiConfirmModal, EuiText, useGeneratedHtmlId } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import React from 'react';
import type { DetectionRule } from '../../../data/rules/use_detection_rules';

export const DeleteRulesModal = ({
  rules,
  isLoading,
  onConfirm,
  onClose,
}: {
  rules: DetectionRule[];
  isLoading: boolean;
  onConfirm: () => void;
  onClose: () => void;
}) => {
  const titleId = useGeneratedHtmlId({ prefix: 'nightshiftDeleteRulesModal' });
  const count = rules.length;
  return (
    <EuiConfirmModal
      aria-labelledby={titleId}
      title={i18n.translate('xpack.nightshift.detectionPage.rules.deleteTitle', {
        defaultMessage: '{count, plural, one {Delete this rule?} other {Delete # rules?}}',
        values: { count },
      })}
      titleProps={{ id: titleId }}
      onCancel={onClose}
      onConfirm={onConfirm}
      cancelButtonText={i18n.translate('xpack.nightshift.detectionPage.rules.cancelDelete', {
        defaultMessage: 'Cancel',
      })}
      confirmButtonText={i18n.translate('xpack.nightshift.detectionPage.rules.confirmDelete', {
        defaultMessage: 'Delete',
      })}
      buttonColor="danger"
      isLoading={isLoading}
      data-test-subj="nightshiftDeleteRulesModal"
    >
      <EuiText size="s">
        <p>
          {i18n.translate('xpack.nightshift.detectionPage.rules.deleteBody', {
            defaultMessage:
              'Nightshift stops running {count, plural, one {this rule} other {these rules}}. The queries stay in Knowledge indicators, where you can promote them again.',
            values: { count },
          })}
        </p>
        {count > 1 ? (
          <ul>
            {rules.map(({ query }) => (
              <li key={query.id}>{query.title}</li>
            ))}
          </ul>
        ) : null}
      </EuiText>
    </EuiConfirmModal>
  );
};
