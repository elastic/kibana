/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { memo, useState } from 'react';
import {
  EuiButton,
  EuiButtonEmpty,
  EuiFormRow,
  EuiModal,
  EuiModalBody,
  EuiModalFooter,
  EuiModalHeader,
  EuiModalHeaderTitle,
  EuiSpacer,
  EuiText,
  EuiTextArea,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';

export interface ActionModalPrimaryAction {
  label: string;
  icon?: string;
  /** Called with the rationale text when the primary button is clicked */
  onClick: (rationale: string) => void;
  color?: 'primary' | 'danger' | 'warning' | 'success' | 'text' | 'accent';
}

export interface BaseActionModalProps {
  type: 'assign' | 'dismiss';
  title: string;
  /** Case/record ID shown in the decision-history body sentence */
  recordId: string;
  /** Optional content rendered between the body text and the rationale field (e.g. an "Assign to" select) */
  children?: React.ReactNode;
  hasAssigneeError?: boolean;
  rationalePlaceholder: string;
  primaryAction: ActionModalPrimaryAction;
  onClose: () => void;
}

export const BaseActionModal = memo<BaseActionModalProps>(
  ({
    type,
    title,
    recordId,
    children,
    hasAssigneeError,
    rationalePlaceholder,
    primaryAction,
    onClose,
  }) => {
    const [rationale, setRationale] = useState('');

    return (
      <EuiModal
        aria-label={i18n.translate('xpack.pnd.actionModal.ariaLabel', {
          defaultMessage: 'Action modal',
        })}
        onClose={onClose}
        style={{ width: 480 }}
      >
        <EuiModalHeader>
          <EuiModalHeaderTitle size="s">{title}</EuiModalHeaderTitle>
        </EuiModalHeader>

        <EuiModalBody>
          {recordId ? (
            <>
              <EuiText size="s">
                <p>
                  {i18n.translate('xpack.pnd.actionModal.bodyText', {
                    defaultMessage:
                      "{recordId} — your decision and rationale are recorded in the proposal's decision history.",
                    values: { recordId },
                  })}
                </p>
              </EuiText>
              <EuiSpacer size="m" />
            </>
          ) : null}

          {children ? (
            <>
              {children}
              <EuiSpacer size="m" />
            </>
          ) : null}

          <EuiFormRow
            fullWidth
            label={i18n.translate('xpack.pnd.actionModal.rationaleLabel', {
              defaultMessage: 'Rationale',
            })}
            helpText={i18n.translate('xpack.pnd.actionModal.rationaleHelpText', {
              defaultMessage: 'Required — captured for audit and evaluation.',
            })}
          >
            <EuiTextArea
              fullWidth
              placeholder={rationalePlaceholder}
              value={rationale}
              onChange={(e) => setRationale(e.target.value)}
              rows={4}
              resize="vertical"
            />
          </EuiFormRow>
        </EuiModalBody>

        <EuiModalFooter>
          <EuiButtonEmpty onClick={onClose}>
            {i18n.translate('xpack.pnd.actionModal.cancel', {
              defaultMessage: 'Cancel',
            })}
          </EuiButtonEmpty>
          <EuiButton
            fill
            color={primaryAction.color ?? 'primary'}
            iconType={primaryAction.icon}
            onClick={() => primaryAction.onClick(rationale)}
            isDisabled={(type === 'assign' && hasAssigneeError) || rationale.trim() === ''}
          >
            {primaryAction.label}
          </EuiButton>
        </EuiModalFooter>
      </EuiModal>
    );
  }
);

BaseActionModal.displayName = 'BaseActionModal';
