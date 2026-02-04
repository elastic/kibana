/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  EuiButton,
  EuiButtonEmpty,
  EuiFlexGroup,
  EuiFlexItem,
  EuiModal,
  EuiModalBody,
  EuiModalFooter,
  EuiModalHeader,
  EuiModalHeaderTitle,
  useEuiTheme,
  useGeneratedHtmlId,
} from '@elastic/eui';
import { css } from '@emotion/react';
import React, { useCallback, useMemo } from 'react';

import * as i18n from '../translations';

/**
 * Data test subject IDs for the UpdateAttacksModal component
 */
export const UPDATE_ATTACKS_MODAL_TEST_ID = 'update-attacks-modal' as const;
export const UPDATE_ATTACKS_MODAL_BODY_TEST_ID = `${UPDATE_ATTACKS_MODAL_TEST_ID}-body` as const;
export const UPDATE_ATTACKS_MODAL_CANCEL_TEST_ID =
  `${UPDATE_ATTACKS_MODAL_TEST_ID}-cancel` as const;
export const UPDATE_ATTACKS_MODAL_UPDATE_ATTACKS_ONLY_TEST_ID =
  `${UPDATE_ATTACKS_MODAL_TEST_ID}-update-attacks-only` as const;
export const UPDATE_ATTACKS_MODAL_UPDATE_ATTACKS_AND_ALERTS_TEST_ID =
  `${UPDATE_ATTACKS_MODAL_TEST_ID}-update-attacks-and-alerts` as const;

/**
 * Type of action being performed on the attacks
 */
export type AttackActionType = 'workflow_status' | 'assignees' | 'tags';

export interface UpdateAttacksModalProps {
  /** Number of related alerts */
  alertsCount: number;
  /** Number of attacks being updated */
  attackDiscoveriesCount: number;
  /** Callback when user cancels the action */
  onCancel: () => void;
  /** Callback when modal is closed */
  onClose: () => void;
  /** Callback when user confirms the action */
  onConfirm: ({ updateAlerts }: { updateAlerts: boolean }) => Promise<void>;
}

/**
 * Generic confirmation modal for bulk actions on attacks.
 * Allows users to choose whether to update only attacks or both attacks and related alerts.
 */
export const UpdateAttacksModal = React.memo<UpdateAttacksModalProps>(
  ({ alertsCount, attackDiscoveriesCount, onCancel, onClose, onConfirm }) => {
    const { euiTheme } = useEuiTheme();
    const modalId = useGeneratedHtmlId({ prefix: 'updateAttacksModal' });
    const titleId = useGeneratedHtmlId();

    const updateAttacksOnly = useCallback(() => onConfirm({ updateAlerts: false }), [onConfirm]);

    const updateAttacksAndAlerts = useCallback(
      () => onConfirm({ updateAlerts: true }),
      [onConfirm]
    );

    const confirmButtons = useMemo(
      () => (
        <EuiFlexGroup alignItems="center" gutterSize="none" responsive={false} wrap={true}>
          <EuiFlexItem
            css={css`
              margin-right: ${euiTheme.size.m};
            `}
            grow={false}
          >
            <EuiButton
              data-test-subj={UPDATE_ATTACKS_MODAL_UPDATE_ATTACKS_ONLY_TEST_ID}
              onClick={updateAttacksOnly}
            >
              {i18n.UPDATE_ATTACKS_ONLY({ attackDiscoveriesCount })}
            </EuiButton>
          </EuiFlexItem>

          <EuiFlexItem grow={false}>
            <EuiButton
              data-test-subj={UPDATE_ATTACKS_MODAL_UPDATE_ATTACKS_AND_ALERTS_TEST_ID}
              color="primary"
              fill
              onClick={updateAttacksAndAlerts}
            >
              {i18n.UPDATE_ATTACKS_AND_ALERTS({
                alertsCount,
                attackDiscoveriesCount,
              })}
            </EuiButton>
          </EuiFlexItem>
        </EuiFlexGroup>
      ),
      [
        alertsCount,
        attackDiscoveriesCount,
        euiTheme.size.m,
        updateAttacksAndAlerts,
        updateAttacksOnly,
      ]
    );

    return (
      <EuiModal
        aria-labelledby={titleId}
        data-test-subj={UPDATE_ATTACKS_MODAL_TEST_ID}
        id={modalId}
        onClose={onClose}
      >
        <EuiModalHeader>
          <EuiModalHeaderTitle title={titleId}>{i18n.UPDATE_ATTACKS_TITLE()}</EuiModalHeaderTitle>
        </EuiModalHeader>

        <EuiModalBody>
          <div data-test-subj={UPDATE_ATTACKS_MODAL_BODY_TEST_ID}>
            {i18n.UPDATE_ATTACKS_ASSOCIATED({
              alertsCount,
              attackDiscoveriesCount,
            })}
          </div>
        </EuiModalBody>

        <EuiModalFooter>
          <EuiFlexGroup
            alignItems="center"
            gutterSize="none"
            justifyContent="spaceBetween"
            responsive={false}
            wrap={true}
          >
            <EuiFlexItem
              css={css`
                margin-right: ${euiTheme.size.xxxl};
              `}
              grow={false}
            >
              <EuiButtonEmpty
                data-test-subj={UPDATE_ATTACKS_MODAL_CANCEL_TEST_ID}
                flush="left"
                onClick={onCancel}
              >
                {i18n.CANCEL}
              </EuiButtonEmpty>
            </EuiFlexItem>

            <EuiFlexItem grow={false}>{confirmButtons}</EuiFlexItem>
          </EuiFlexGroup>
        </EuiModalFooter>
      </EuiModal>
    );
  }
);
UpdateAttacksModal.displayName = 'UpdateAttacksModal';
