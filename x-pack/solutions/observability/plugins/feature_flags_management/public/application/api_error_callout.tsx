/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiButton, EuiCallOut, EuiSpacer, EuiText } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';
import type { ValidationIssue } from '../../common';
import { apiErrorSummary, isVersionConflict, type FeatureFlagsApiError } from './api_error';
import { reloadButtonLabel } from './labels';

export const ApiErrorCallout = ({
  error,
  onReload,
}: {
  error: FeatureFlagsApiError;
  onReload?: () => void;
}) => {
  const conflict = isVersionConflict(error);
  return (
    <EuiCallOut
      color="danger"
      iconType="error"
      title={
        conflict
          ? i18n.translate('xpack.featureFlagsManagement.api.versionConflictTitle', {
              defaultMessage: 'This changed since you loaded it',
            })
          : i18n.translate('xpack.featureFlagsManagement.api.requestFailedTitle', {
              defaultMessage: 'The request failed',
            })
      }
    >
      <EuiText size="s">
        <p>{apiErrorSummary(error)}</p>
      </EuiText>
      {error.issues.length > 0 && (
        <>
          <EuiSpacer size="s" />
          <IssueList issues={error.issues} />
        </>
      )}
      {conflict && onReload && (
        <>
          <EuiSpacer size="s" />
          <EuiButton
            data-test-subj="featureFlagsManagementApiErrorCalloutButton"
            size="s"
            onClick={onReload}
          >
            {reloadButtonLabel()}
          </EuiButton>
        </>
      )}
    </EuiCallOut>
  );
};

export const ValidationIssuesCallout = ({ issues }: { issues: readonly ValidationIssue[] }) => {
  if (issues.length === 0) {
    return null;
  }
  return (
    <EuiCallOut
      color="danger"
      iconType="error"
      title={
        <FormattedMessage
          id="xpack.featureFlagsManagement.flags.editor.validationTitle"
          defaultMessage="Fix these problems before saving"
        />
      }
    >
      <IssueList issues={issues} />
    </EuiCallOut>
  );
};

const IssueList = ({ issues }: { issues: readonly { path: string; message: string }[] }) => (
  <ul>
    {issues.map((issue) => (
      <li key={`${issue.path}:${issue.message}`}>
        {issue.path ? (
          <FormattedMessage
            id="xpack.featureFlagsManagement.api.issueDescription"
            defaultMessage="{path}: {message}"
            values={{ path: issue.path, message: issue.message }}
          />
        ) : (
          issue.message
        )}
      </li>
    ))}
  </ul>
);
