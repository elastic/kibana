/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  EuiButton,
  EuiFlexGroup,
  EuiFlexItem,
  EuiSpacer,
  EuiCallOut,
  EuiButtonEmpty,
  useEuiTheme,
  EuiCodeBlock,
  EuiText,
} from '@elastic/eui';
import React from 'react';
import { FormattedMessage } from '@kbn/i18n-react';
import { css } from '@emotion/react';
import type { PrivmonBulkUploadUsersCSVResponse } from '../../../../../../../common/api/entity_analytics';
import { buildAnnotationsFromError } from '../helpers';

export const PrivilegedUserMonitoringErrorStep: React.FC<{
  result?: PrivmonBulkUploadUsersCSVResponse;
  validLinesAsText: string;
  errorMessage?: string;
  goToFirstStep: () => void;
  onClose: () => void;
}> = ({ result, validLinesAsText, errorMessage, goToFirstStep, onClose }) => {
  const { euiTheme } = useEuiTheme();

  if (errorMessage !== undefined) {
    return (
      <>
        <EuiCallOut
          announceOnMount
          color="danger"
          iconType="cross"
          title={
            <FormattedMessage
              id="xpack.securitySolution.entityAnalytics.privilegedUserMonitoring.fileUploader.errorStep.errorTitle"
              defaultMessage="Error uploading file"
            />
          }
        >
          <p>{errorMessage}</p>
        </EuiCallOut>

        <ErrorStepFooter onTryAgain={goToFirstStep} onClose={onClose} />
      </>
    );
  }

  if (result === undefined || result.stats.failedOperations === 0) {
    return null;
  }

  const annotations = buildAnnotationsFromError(result.errors);

  return (
    <>
      <EuiCallOut
        title={
          <FormattedMessage
            defaultMessage="Some privileged user assignments were unsuccessful due to errors."
            id="xpack.securitySolution.entityAnalytics.privilegedUserMonitoring.fileUploader.errorStep.title"
          />
        }
        color="warning"
        iconType="warning"
      >
        <EuiSpacer size="s" />
        <EuiText size="s">
          <FormattedMessage
            defaultMessage="{assignedCount, plural, one {# privileged user assignment succeeded.} other {# privileged user assignments succeeded.}}"
            id="xpack.securitySolution.entityAnalytics.privilegedUserMonitoring.fileUploader.errorStep.assignedEntities"
            values={{ assignedCount: result.stats.successfulOperations }}
          />
        </EuiText>
        <EuiText size="s" color={euiTheme.colors.danger}>
          <FormattedMessage
            defaultMessage="{failedCount, plural, one {# privileged user assignment failed.} other {# privileged user assignments failed.}}"
            id="xpack.securitySolution.entityAnalytics.privilegedUserMonitoring.fileUploader.errorStep.failedEntities"
            values={{ failedCount: result.stats.failedOperations }}
          />
        </EuiText>

        <EuiCodeBlock
          overflowHeight={300}
          language="CSV"
          isVirtualized
          css={css`
            border: 1px solid ${euiTheme.colors.warning};
          `}
          lineNumbers={{ annotations }}
        >
          {validLinesAsText}
        </EuiCodeBlock>
      </EuiCallOut>
      <ErrorStepFooter onTryAgain={goToFirstStep} onClose={onClose} />
    </>
  );
};

const ErrorStepFooter = ({
  onTryAgain,
  onClose,
}: {
  onTryAgain: () => void;
  onClose: () => void;
}) => (
  <>
    <EuiSpacer size="m" />
    <EuiFlexGroup justifyContent="spaceBetween" gutterSize="s">
      <EuiFlexItem grow={false}>
        <EuiButtonEmpty onClick={onClose}>
          <FormattedMessage
            id="xpack.securitySolution.entityAnalytics.privilegedUserMonitoring.fileUploader.errorStep.cancelButton"
            defaultMessage="Cancel"
          />
        </EuiButtonEmpty>
      </EuiFlexItem>
      <EuiFlexItem grow={false}>
        <EuiButton onClick={onTryAgain} color="primary" fill>
          <FormattedMessage
            id="xpack.securitySolution.entityAnalytics.privilegedUserMonitoring.fileUploader.errorStep.tryAgainButton"
            defaultMessage="Try again"
          />
        </EuiButton>
      </EuiFlexItem>
    </EuiFlexGroup>
  </>
);
