/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import {
  EuiButton,
  EuiButtonEmpty,
  EuiCallOut,
  EuiCodeBlock,
  EuiFilePicker,
  EuiFlexGroup,
  EuiFlexItem,
  EuiPanel,
  EuiSpacer,
  EuiText,
  EuiTitle,
  useEuiTheme,
} from '@elastic/eui';
import { css } from '@emotion/css';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';
import { useFormatBytes } from '../../../../common/components/formatted_bytes';
import { useWatchlistCsvUpload } from './use_watchlist_csv_upload';
import { SUPPORTED_FILE_TYPES, MAX_FILE_SIZE_BYTES, SUPPORTED_FILE_EXTENSIONS } from './constants';

interface WatchlistCsvUploadProps {
  watchlistId: string;
}

// prettier-ignore
const SAMPLE_CSV =
`type,user.name,host.hostname
user,john.doe,
host,,webserver-01`;

export const WatchlistCsvUpload: React.FC<WatchlistCsvUploadProps> = ({ watchlistId }) => {
  const { euiTheme } = useEuiTheme();
  const formatBytes = useFormatBytes();
  const { status, validatedFile, uploadResponse, error, onFileChange, onUpload, onReset } =
    useWatchlistCsvUpload({ watchlistId });

  const isUploading = status === 'uploading';
  const isSuccess = status === 'success';
  const hasError = status === 'error';
  const isReady = status === 'ready';

  if (isSuccess && uploadResponse) {
    return <UploadResult uploadResponse={uploadResponse} onReset={onReset} />;
  }

  return (
    <>
      <EuiPanel color="subdued" paddingSize="l" grow={false} hasShadow={false}>
        <EuiTitle size="xxs">
          <h3>
            <FormattedMessage
              id="xpack.securitySolution.entityAnalytics.watchlists.flyout.csv.formatRequirementsTitle"
              defaultMessage="Supported file formats and size"
            />
          </h3>
        </EuiTitle>
        <EuiSpacer size="s" />
        <ul
          className={css`
            list-style-type: disc;
            margin-bottom: ${euiTheme.size.l};
            margin-left: ${euiTheme.size.l};
          `}
        >
          <li>
            <FormattedMessage
              id="xpack.securitySolution.entityAnalytics.watchlists.flyout.csv.acceptedFormats"
              defaultMessage="File formats: {formats}"
              values={{ formats: SUPPORTED_FILE_EXTENSIONS.join(', ') }}
            />
          </li>
          <li>
            <FormattedMessage
              id="xpack.securitySolution.entityAnalytics.watchlists.flyout.csv.maxFileSize"
              defaultMessage="Maximum file size: {maxFileSize}"
              values={{ maxFileSize: formatBytes(MAX_FILE_SIZE_BYTES) }}
            />
          </li>
        </ul>
        <EuiTitle size="xxs">
          <h3>
            <FormattedMessage
              id="xpack.securitySolution.entityAnalytics.watchlists.flyout.csv.requiredStructureTitle"
              defaultMessage="Required file structure"
            />
          </h3>
        </EuiTitle>
        <EuiSpacer size="s" />
        <ul
          className={css`
            list-style-type: disc;
            margin-bottom: ${euiTheme.size.l};
            margin-left: ${euiTheme.size.l};
          `}
        >
          <li>
            <FormattedMessage
              id="xpack.securitySolution.entityAnalytics.watchlists.flyout.csv.headerDescription"
              defaultMessage='Header row: The first row must contain column headers including "type".'
            />
          </li>
          <li>
            <FormattedMessage
              id="xpack.securitySolution.entityAnalytics.watchlists.flyout.csv.entityTypeDescription"
              defaultMessage='Entity type: The "type" column must contain one of: user, host, or service.'
            />
          </li>
          <li>
            <FormattedMessage
              id="xpack.securitySolution.entityAnalytics.watchlists.flyout.csv.identifierDescription"
              defaultMessage="Identity fields: Additional columns should be ECS identity fields (e.g., user.name, host.hostname) used to match entities in the entity store."
            />
          </li>
        </ul>
        <EuiTitle size="xxs">
          <h3>
            <FormattedMessage
              id="xpack.securitySolution.entityAnalytics.watchlists.flyout.csv.exampleTitle"
              defaultMessage="Example"
            />
          </h3>
        </EuiTitle>
        <EuiSpacer size="s" />
        <EuiCodeBlock
          language="csv"
          css={css`
            background-color: ${euiTheme.colors.emptyShade};
          `}
          paddingSize="s"
          lineNumbers
          isCopyable
        >
          {SAMPLE_CSV}
        </EuiCodeBlock>
      </EuiPanel>

      <EuiSpacer size="l" />

      <EuiFilePicker
        data-test-subj="watchlist-csv-file-picker"
        accept={SUPPORTED_FILE_TYPES.join(',')}
        fullWidth
        onChange={onFileChange}
        isInvalid={hasError}
        isLoading={status === 'validating' || isUploading}
        aria-label={i18n.translate(
          'xpack.securitySolution.entityAnalytics.watchlists.flyout.csv.filePickerAriaLabel',
          { defaultMessage: 'Watchlist CSV file picker' }
        )}
      />

      {hasError && error && (
        <>
          <EuiSpacer size="s" />
          <EuiText color="danger" size="xs">
            {error}
          </EuiText>
        </>
      )}

      {isReady && validatedFile && (
        <>
          <EuiSpacer size="m" />
          <EuiText size="xs" color="subdued">
            <FormattedMessage
              id="xpack.securitySolution.entityAnalytics.watchlists.flyout.csv.fileInfo"
              defaultMessage="{rowCount} {rowCount, plural, one {row} other {rows}} detected. Columns: {columns}"
              values={{
                rowCount: validatedFile.rowCount,
                columns: validatedFile.headers.join(', '),
              }}
            />
          </EuiText>
          <EuiSpacer size="m" />
          <EuiButton
            data-test-subj="watchlist-csv-upload-button"
            onClick={onUpload}
            isLoading={isUploading}
            iconType="importAction"
          >
            <FormattedMessage
              id="xpack.securitySolution.entityAnalytics.watchlists.flyout.csv.uploadButton"
              defaultMessage="Upload"
            />
          </EuiButton>
        </>
      )}
    </>
  );
};

const UploadResult: React.FC<{
  uploadResponse: NonNullable<ReturnType<typeof useWatchlistCsvUpload>['uploadResponse']>;
  onReset: () => void;
}> = ({ uploadResponse, onReset }) => {
  const { successful, failed, total, unmatched } = uploadResponse;
  const allSuccessful = failed === 0 && unmatched === 0;
  const allFailed = successful === 0;

  let color: 'success' | 'warning' | 'danger';
  let iconType: string;
  let title: string;

  if (allSuccessful) {
    color = 'success';
    iconType = 'checkCircleFilled';
    title = i18n.translate(
      'xpack.securitySolution.entityAnalytics.watchlists.flyout.csv.result.allSuccess',
      {
        defaultMessage:
          '{count} {count, plural, one {entity} other {entities}} added to the watchlist.',
        values: { count: successful },
      }
    );
  } else if (allFailed) {
    color = 'danger';
    iconType = 'error';
    title = i18n.translate(
      'xpack.securitySolution.entityAnalytics.watchlists.flyout.csv.result.allFailed',
      { defaultMessage: 'No entities were added to the watchlist.' }
    );
  } else {
    color = 'warning';
    iconType = 'warning';
    title = i18n.translate(
      'xpack.securitySolution.entityAnalytics.watchlists.flyout.csv.result.partial',
      {
        defaultMessage: '{successful} of {total} rows matched and added to the watchlist.',
        values: { successful, total },
      }
    );
  }

  return (
    <>
      <EuiCallOut title={title} color={color} iconType={iconType}>
        {!allSuccessful && (
          <EuiFlexGroup direction="column" gutterSize="xs">
            {successful > 0 && (
              <EuiFlexItem>
                <EuiText size="s">
                  <FormattedMessage
                    id="xpack.securitySolution.entityAnalytics.watchlists.flyout.csv.result.successCount"
                    defaultMessage="{count} {count, plural, one {row} other {rows}} matched entities and were added."
                    values={{ count: successful }}
                  />
                </EuiText>
              </EuiFlexItem>
            )}
            {unmatched > 0 && (
              <EuiFlexItem>
                <EuiText size="s">
                  <FormattedMessage
                    id="xpack.securitySolution.entityAnalytics.watchlists.flyout.csv.result.unmatchedCount"
                    defaultMessage="{count} {count, plural, one {row} other {rows}} had no matching entities in the entity store."
                    values={{ count: unmatched }}
                  />
                </EuiText>
              </EuiFlexItem>
            )}
            {failed > 0 && (
              <EuiFlexItem>
                <EuiText size="s">
                  <FormattedMessage
                    id="xpack.securitySolution.entityAnalytics.watchlists.flyout.csv.result.failedCount"
                    defaultMessage="{count} {count, plural, one {row} other {rows}} had errors."
                    values={{ count: failed }}
                  />
                </EuiText>
              </EuiFlexItem>
            )}
          </EuiFlexGroup>
        )}
      </EuiCallOut>
      <EuiSpacer size="m" />
      <EuiButtonEmpty
        data-test-subj="watchlist-csv-upload-another"
        onClick={onReset}
        iconType="refresh"
        flush="left"
      >
        <FormattedMessage
          id="xpack.securitySolution.entityAnalytics.watchlists.flyout.csv.uploadAnother"
          defaultMessage="Upload another file"
        />
      </EuiButtonEmpty>
    </>
  );
};
