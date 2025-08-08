/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { memo } from 'react';
import { EuiConfirmModal, useGeneratedHtmlId } from '@elastic/eui';
import type { MlSummaryJob } from '@kbn/ml-plugin/common';
import styled from 'styled-components';
import { rgba } from 'polished';
import * as i18n from './translations';

const JobsUL = styled.ul`
  max-height: 200px;
  overflow-y: auto;

  &::-webkit-scrollbar {
    height: ${({ theme }) => theme.eui.euiScrollBar};
    width: ${({ theme }) => theme.eui.euiScrollBar};
  }

  &::-webkit-scrollbar-thumb {
    background-clip: content-box;
    background-color: ${({ theme }) => rgba(theme.eui.euiColorDarkShade, 0.5)};
    border: ${({ theme }) => theme.eui.euiScrollBarCorner} solid transparent;
  }

  &::-webkit-scrollbar-corner,
  &::-webkit-scrollbar-track {
    background-color: transparent;
  }
`;

interface OutdatedMlJobsUpgradeModalProps {
  jobs: MlSummaryJob[];
  onCancel: () => void;
  onConfirm: () => void;
}

export const OutdatedMlJobsUpgradeModal = memo(function LegacyMlJobsUpgradeModal({
  jobs,
  onCancel,
  onConfirm,
}: OutdatedMlJobsUpgradeModalProps): JSX.Element {
  const modalTitleId = useGeneratedHtmlId();

  return (
    <EuiConfirmModal
      aria-labelledby={modalTitleId}
      title={i18n.ML_JOB_UPGRADE_MODAL_TITLE}
      titleProps={{ id: modalTitleId }}
      onCancel={onCancel}
      onConfirm={onConfirm}
      cancelButtonText={i18n.ML_JOB_UPGRADE_MODAL_CANCEL}
      confirmButtonText={i18n.ML_JOB_UPGRADE_MODAL_CONFIRM}
      buttonColor="danger"
      defaultFocusedButton="confirm"
    >
      <i18n.MlJobUpgradeModalBody />
      {i18n.ML_JOB_UPGRADE_MODAL_AFFECTED_JOBS}
      <JobsUL>
        {jobs.map((j) => {
          return <li key={j.id}>{j.id}</li>;
        })}
      </JobsUL>
    </EuiConfirmModal>
  );
});
