/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';
import { EuiEmptyPrompt, EuiButton } from '@elastic/eui';
import styled from '@emotion/styled';

interface Props {
  retry: () => void;
}

export const LogAnalysisSetupStatusUnknownPrompt: React.FunctionComponent<Props> = ({
  retry,
}: Props) => (
  <EmptyPrompt
    title={
      <h2>
        <FormattedMessage
          id="xpack.infra.logs.analysis.setupStatusUnknownTitle"
          defaultMessage="We couldn't determine the status of your ML jobs."
        />
      </h2>
    }
    actions={
      <EuiButton
        data-test-subj="infraLogAnalysisSetupStatusUnknownPromptTryAgainButton"
        onClick={() => retry()}
        color="primary"
        fill
      >
        {i18n.translate('xpack.infra.logs.analysis.setupStatusTryAgainButton', {
          defaultMessage: 'Try again',
        })}
      </EuiButton>
    }
  />
);

const EmptyPrompt = styled(EuiEmptyPrompt)`
  align-self: center;
`;
