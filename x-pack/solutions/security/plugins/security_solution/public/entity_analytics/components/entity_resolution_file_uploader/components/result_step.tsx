/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiButton, EuiCallOut, EuiSpacer, EuiText } from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n-react';
import type { ResolutionCsvUploadResponse } from '../types';

interface ResultStepProps {
  result?: ResolutionCsvUploadResponse;
  errorMessage?: string;
  onReturn: () => void;
}

export const EntityResolutionResultStep: React.FC<ResultStepProps> = React.memo(
  ({ result, errorMessage, onReturn }) => {
    if (errorMessage) {
      return (
        <>
          <EuiSpacer size="m" />
          <EuiCallOut
            title={
              <FormattedMessage
                defaultMessage="Upload failed"
                id="xpack.securitySolution.entityAnalytics.entityResolutionUpload.uploadFailedTitle"
              />
            }
            color="danger"
            iconType="error"
          >
            <EuiText size="s">{errorMessage}</EuiText>
          </EuiCallOut>
          <EuiSpacer size="m" />
          <UploadAnotherFileButton onClick={onReturn} />
        </>
      );
    }

    if (!result) {
      return null;
    }

    const allSuccessful = result.failed === 0 && result.unmatched === 0;
    const allFailed = result.successful === 0;
    const partialSuccess = !allSuccessful && !allFailed;

    return (
      <>
        <EuiSpacer size="m" />
        {allSuccessful && (
          <EuiCallOut
            title={
              <FormattedMessage
                defaultMessage="All {total} {total, plural, one {row} other {rows}} processed successfully"
                id="xpack.securitySolution.entityAnalytics.entityResolutionUpload.allSuccessTitle"
                values={{ total: result.total }}
              />
            }
            color="success"
            iconType="checkInCircleFilled"
          >
            <ResultStats result={result} />
          </EuiCallOut>
        )}

        {partialSuccess && (
          <EuiCallOut
            title={
              <FormattedMessage
                defaultMessage="Partial upload: {successful} of {total} {total, plural, one {row} other {rows}} successful"
                id="xpack.securitySolution.entityAnalytics.entityResolutionUpload.partialSuccessTitle"
                values={{ successful: result.successful, total: result.total }}
              />
            }
            color="warning"
            iconType="warning"
          >
            <ResultStats result={result} />
          </EuiCallOut>
        )}

        {allFailed && (
          <EuiCallOut
            title={
              <FormattedMessage
                defaultMessage="Upload completed with no successful links"
                id="xpack.securitySolution.entityAnalytics.entityResolutionUpload.allFailedTitle"
              />
            }
            color="danger"
            iconType="error"
          >
            <ResultStats result={result} />
          </EuiCallOut>
        )}

        {(result.failed > 0 || result.unmatched > 0) && (
          <>
            <EuiSpacer size="m" />
            <ResultDetails result={result} />
          </>
        )}

        <EuiSpacer size="m" />
        <UploadAnotherFileButton onClick={onReturn} />
      </>
    );
  }
);

EntityResolutionResultStep.displayName = 'EntityResolutionResultStep';

const ResultStats: React.FC<{ result: ResolutionCsvUploadResponse }> = ({ result }) => (
  <EuiText size="s">
    <ul>
      <li>
        <FormattedMessage
          defaultMessage="{count} {count, plural, one {row} other {rows}} linked successfully"
          id="xpack.securitySolution.entityAnalytics.entityResolutionUpload.successCount"
          values={{ count: result.successful }}
        />
      </li>
      {result.unmatched > 0 && (
        <li>
          <FormattedMessage
            defaultMessage="{count} {count, plural, one {row} other {rows}} had no matching entities"
            id="xpack.securitySolution.entityAnalytics.entityResolutionUpload.unmatchedCount"
            values={{ count: result.unmatched }}
          />
        </li>
      )}
      {result.failed > 0 && (
        <li>
          <FormattedMessage
            defaultMessage="{count} {count, plural, one {row} other {rows}} failed"
            id="xpack.securitySolution.entityAnalytics.entityResolutionUpload.failedCount"
            values={{ count: result.failed }}
          />
        </li>
      )}
    </ul>
  </EuiText>
);

const ResultDetails: React.FC<{ result: ResolutionCsvUploadResponse }> = ({ result }) => {
  const problemRows = result.items
    .map((item, index) => ({ ...item, rowIndex: index + 1 }))
    .filter((item) => item.status !== 'success');

  if (problemRows.length === 0) {
    return null;
  }

  return (
    <EuiText size="xs">
      {problemRows.map((row) => (
        <p key={row.rowIndex}>
          <strong>
            <FormattedMessage
              defaultMessage="Row {index}:"
              id="xpack.securitySolution.entityAnalytics.entityResolutionUpload.rowLabel"
              values={{ index: row.rowIndex }}
            />
          </strong>{' '}
          {row.status === 'unmatched' ? (
            <FormattedMessage
              defaultMessage="No matching entities found"
              id="xpack.securitySolution.entityAnalytics.entityResolutionUpload.unmatchedRow"
            />
          ) : (
            row.error
          )}
        </p>
      ))}
    </EuiText>
  );
};

const UploadAnotherFileButton: React.FC<{ onClick: () => void }> = ({ onClick }) => (
  <EuiButton onClick={onClick} iconType="refresh">
    <FormattedMessage
      defaultMessage="Upload another file"
      id="xpack.securitySolution.entityAnalytics.entityResolutionUpload.uploadAnotherButton"
    />
  </EuiButton>
);
