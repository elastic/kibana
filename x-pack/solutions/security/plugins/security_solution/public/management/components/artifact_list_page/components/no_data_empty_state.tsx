/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { memo } from 'react';
import styled, { css } from 'styled-components';
import { EuiButton, EuiEmptyPrompt, EuiSpacer } from '@elastic/eui';
import { ManagementEmptyStateWrapper } from '../../management_empty_state_wrapper';
import { useTestIdGenerator } from '../../../hooks/use_test_id_generator';

const EmptyPrompt = styled(EuiEmptyPrompt)`
  ${() => css`
    max-width: 100%;
  `}
`;

export const NoDataEmptyState = memo<{
  onAdd: () => void;
  titleLabel: string;
  titleNoEntriesLabel: string;
  aboutInfo: string;
  primaryButtonLabel: string;
  canCreateItems?: boolean;
  /** Should the Add button be disabled */
  isAddDisabled?: boolean;
  backComponent?: React.ReactNode;
  secondaryAboutInfo?: React.ReactNode;
  'data-test-subj'?: string;
}>(
  ({
    onAdd,
    isAddDisabled = false,
    backComponent,
    'data-test-subj': dataTestSubj,
    titleLabel,
    titleNoEntriesLabel,
    aboutInfo,
    primaryButtonLabel,
    secondaryAboutInfo,
    canCreateItems = true,
  }) => {
    const getTestId = useTestIdGenerator(dataTestSubj);

    return (
      <ManagementEmptyStateWrapper>
        {canCreateItems ? (
          <EmptyPrompt
            data-test-subj={dataTestSubj}
            iconType="plusInCircle"
            title={<h2 data-test-subj={getTestId('title')}>{titleLabel}</h2>}
            body={
              <div data-test-subj={getTestId('aboutInfo')}>
                {aboutInfo}
                {secondaryAboutInfo ? (
                  <>
                    <EuiSpacer size="m" />
                    {secondaryAboutInfo}
                  </>
                ) : undefined}
              </div>
            }
            actions={[
              <EuiButton
                fill
                isDisabled={isAddDisabled}
                onClick={onAdd}
                data-test-subj={getTestId('addButton')}
              >
                {primaryButtonLabel}
              </EuiButton>,
              ...(backComponent ? [backComponent] : []),
            ]}
          />
        ) : (
          <EmptyPrompt
            data-test-subj={dataTestSubj}
            iconType="iInCircle"
            title={<h2 data-test-subj={getTestId('title-no-entries')}>{titleNoEntriesLabel}</h2>}
          />
        )}
      </ManagementEmptyStateWrapper>
    );
  }
);

NoDataEmptyState.displayName = 'NoDataEmptyState';
