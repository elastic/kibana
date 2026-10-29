/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiSpacer, EuiText } from '@elastic/eui';
import { getEbtProps } from '@kbn/ebt-click';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';
import { KbnDangerCallout } from '@kbn/ui-callout';
import type { ValidationIssue } from '../../common';
import { apiErrorSummary, isVersionConflict, type FeatureFlagsApiError } from './api_error';
import { FEATURE_FLAGS_EBT_ACTIONS, FEATURE_FLAGS_EBT_ELEMENT } from './ebt';
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
    <KbnDangerCallout
      title={
        conflict
          ? i18n.translate('xpack.featureFlagsManagement.api.versionConflictTitle', {
              defaultMessage: 'This changed since you loaded it',
            })
          : i18n.translate('xpack.featureFlagsManagement.api.requestFailedTitle', {
              defaultMessage: 'The request failed',
            })
      }
      text={
        <>
          <EuiText size="s">
            <p>{apiErrorSummary(error)}</p>
          </EuiText>
          {error.issues.length > 0 && (
            <>
              <EuiSpacer size="s" />
              <IssueList issues={error.issues} />
            </>
          )}
        </>
      }
      actionProps={
        conflict && onReload
          ? {
              primary: {
                children: reloadButtonLabel(),
                onClick: onReload,
                'data-test-subj': 'featureFlagsManagementApiErrorCalloutButton',
                ...getEbtProps({
                  action: FEATURE_FLAGS_EBT_ACTIONS.reload,
                  element: FEATURE_FLAGS_EBT_ELEMENT,
                }),
              },
            }
          : undefined
      }
    />
  );
};

export const ValidationIssuesCallout = ({ issues }: { issues: readonly ValidationIssue[] }) => {
  if (issues.length === 0) {
    return null;
  }
  return (
    <KbnDangerCallout
      title={
        <FormattedMessage
          id="xpack.featureFlagsManagement.flags.editor.validationTitle"
          defaultMessage="Fix these problems before saving"
        />
      }
      text={<IssueList issues={issues} />}
    />
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
