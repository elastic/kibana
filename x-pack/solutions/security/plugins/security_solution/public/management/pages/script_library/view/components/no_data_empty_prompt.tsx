/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { memo } from 'react';
import { css } from '@emotion/react';
import { EuiButton, EuiEmptyPrompt } from '@elastic/eui';
import { ManagementEmptyStateWrapper } from '../../../../components/management_empty_state_wrapper';
import { useTestIdGenerator } from '../../../../hooks/use_test_id_generator';
import { SCRIPT_LIBRARY_LABELS } from '../../translations';

const emptyPromptCss = css`
  max-width: 100%;
`;

interface NoDataEmptyPromptProps {
  onClick: () => void;
  canCreateScript?: boolean;
  isAddDisabled?: boolean;
  'data-test-subj'?: string;
}

export const NoDataEmptyPrompt = memo<NoDataEmptyPromptProps>(
  ({ onClick, isAddDisabled = false, 'data-test-subj': dataTestSubj, canCreateScript = false }) => {
    const getTestId = useTestIdGenerator(dataTestSubj);

    return (
      <ManagementEmptyStateWrapper>
        {!canCreateScript ? (
          <EuiEmptyPrompt
            css={emptyPromptCss}
            data-test-subj={dataTestSubj}
            iconType="info"
            title={
              <h2 data-test-subj={getTestId('title-no-entries')}>
                {SCRIPT_LIBRARY_LABELS.noPrivilegeEmptyTitle}
              </h2>
            }
          />
        ) : (
          <EuiEmptyPrompt
            css={emptyPromptCss}
            data-test-subj={dataTestSubj}
            iconType="plusInCircle"
            title={
              <h2 data-test-subj={getTestId('title')}>{SCRIPT_LIBRARY_LABELS.emptyStateTitle}</h2>
            }
            body={
              <div data-test-subj={getTestId('about-info')}>
                {SCRIPT_LIBRARY_LABELS.emptyStateInfo}
              </div>
            }
            actions={
              <EuiButton
                fill
                iconType="upload"
                isDisabled={isAddDisabled}
                onClick={onClick}
                data-test-subj={getTestId('upload-button')}
              >
                {SCRIPT_LIBRARY_LABELS.emptyStatePrimaryButtonLabel}
              </EuiButton>
            }
          />
        )}
      </ManagementEmptyStateWrapper>
    );
  }
);

NoDataEmptyPrompt.displayName = 'NoDataEmptyPrompt';
