/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiButton, EuiEmptyPrompt } from '@elastic/eui';
import type { ReactNode } from 'react';
import React from 'react';
import styled from '@emotion/styled';

interface NoDataProps {
  titleText: string;
  bodyText: string | ReactNode;
  refetchText?: string;
  onRefetch?: () => void;
  testString?: string;
}

export const NoData: React.FC<NoDataProps> = ({
  titleText,
  bodyText,
  refetchText,
  onRefetch,
  testString,
}) => {
  const showRefetchButton = refetchText && onRefetch;

  return (
    <CenteredEmptyPrompt
      title={<h2>{titleText}</h2>}
      titleSize="m"
      body={<p>{bodyText}</p>}
      actions={
        showRefetchButton ? (
          <EuiButton
            data-test-subj="infraNoDataButton"
            iconType="refresh"
            color="primary"
            fill
            onClick={onRefetch}
          >
            {refetchText}
          </EuiButton>
        ) : null
      }
      data-test-subj={testString}
    />
  );
};

const CenteredEmptyPrompt = styled(EuiEmptyPrompt)`
  align-self: center;
`;
