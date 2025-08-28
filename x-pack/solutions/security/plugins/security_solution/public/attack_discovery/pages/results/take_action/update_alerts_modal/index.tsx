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

import * as i18n from './translations';

interface Props {
  alertsCount: number;
  attackDiscoveriesCount: number;
  onCancel: () => void;
  onClose: () => void;
  onConfirm: ({
    updateAlerts,
    workflowStatus,
  }: {
    updateAlerts: boolean;
    workflowStatus: 'open' | 'acknowledged' | 'closed';
  }) => Promise<void>;
  workflowStatus: 'open' | 'acknowledged' | 'closed';
}

const UpdateAlertsModalComponent: React.FC<Props> = ({
  alertsCount,
  attackDiscoveriesCount,
  onCancel,
  onClose,
  onConfirm,
  workflowStatus,
}) => {
  const { euiTheme } = useEuiTheme();
  const modalId = useGeneratedHtmlId({ prefix: 'confirmModal' });
  const titleId = useGeneratedHtmlId();

  const markDiscoveriesOnly = useCallback(() => {
    onConfirm({ updateAlerts: false, workflowStatus });
  }, [onConfirm, workflowStatus]);

  const markAlertsAndDiscoveries = useCallback(() => {
    onConfirm({ updateAlerts: true, workflowStatus });
  }, [onConfirm, workflowStatus]);

  const confirmButtons = useMemo(
    () => (
      <EuiFlexGroup alignItems="center" gutterSize="none" responsive={false} wrap={true}>
        <EuiFlexItem
          css={css`
            margin-right: ${euiTheme.size.m};
          `}
          grow={false}
        >
          <EuiButton data-test-subj="markDiscoveriesOnly" onClick={markDiscoveriesOnly}>
            {i18n.MARK_DISCOVERIES_ONLY({
              attackDiscoveriesCount,
              workflowStatus,
            })}
          </EuiButton>
        </EuiFlexItem>

        <EuiFlexItem grow={false}>
          <EuiButton
            data-test-subj="markAlertsAndDiscoveries"
            color="primary"
            fill
            onClick={markAlertsAndDiscoveries}
          >
            {i18n.MARK_ALERTS_AND_DISCOVERIES({
              alertsCount,
              attackDiscoveriesCount,
              workflowStatus,
            })}
          </EuiButton>
        </EuiFlexItem>
      </EuiFlexGroup>
    ),
    [
      alertsCount,
      attackDiscoveriesCount,
      euiTheme.size.m,
      markAlertsAndDiscoveries,
      markDiscoveriesOnly,
      workflowStatus,
    ]
  );

  return (
    <EuiModal
      aria-labelledby={titleId}
      data-test-subj="confirmModal"
      id={modalId}
      onClose={onClose}
    >
      <EuiModalHeader>
        <EuiModalHeaderTitle title={titleId}>{i18n.UPDATE_ALERTS}</EuiModalHeaderTitle>
      </EuiModalHeader>

      <EuiModalBody>
        <div data-test-subj="modalBody">
          {i18n.UPDATE_ALERTS_ASSOCIATED({
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
            <EuiButtonEmpty data-test-subj="cancel" flush="left" onClick={onCancel}>
              {i18n.CANCEL}
            </EuiButtonEmpty>
          </EuiFlexItem>

          <EuiFlexItem grow={false}>{confirmButtons}</EuiFlexItem>
        </EuiFlexGroup>
      </EuiModalFooter>
    </EuiModal>
  );
};

UpdateAlertsModalComponent.displayName = 'UpdateAlertsModal';

export const UpdateAlertsModal = React.memo(UpdateAlertsModalComponent);
