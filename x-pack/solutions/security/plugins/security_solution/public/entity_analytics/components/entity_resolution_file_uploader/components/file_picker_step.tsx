/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  EuiCodeBlock,
  EuiFilePicker,
  EuiPanel,
  EuiSpacer,
  EuiText,
  EuiTitle,
  useEuiFontSize,
  useEuiTheme,
} from '@elastic/eui';
import { css } from '@emotion/css';
import React from 'react';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';
import { useFormatBytes } from '../../../../common/components/formatted_bytes';
import { SUPPORTED_FILE_EXTENSIONS, SUPPORTED_FILE_TYPES, MAX_FILE_SIZE_BYTES } from '../constants';

interface FilePickerStepProps {
  onFileChange: (fileList: FileList | null) => void;
  isLoading: boolean;
  errorMessage?: string;
}

const SAMPLE_CSV = `type,user.email,user.name,resolved_to
user,emily@acme.com,,user:emily.chen@acme.com@okta
user,echen@azure.com,,user:emily.chen@acme.com@okta
user,,bob.smith,user:bob@acme.com@active_directory`;

export const EntityResolutionFilePickerStep: React.FC<FilePickerStepProps> = React.memo(
  ({ onFileChange, errorMessage, isLoading }) => {
    const formatBytes = useFormatBytes();
    const { euiTheme } = useEuiTheme();

    const listStyle = css`
      list-style-type: disc;
      margin-bottom: ${euiTheme.size.l};
      margin-left: ${euiTheme.size.l};
      line-height: ${useEuiFontSize('s').lineHeight};
    `;

    return (
      <>
        <EuiSpacer size="m" />
        <EuiPanel color="subdued" paddingSize="l" grow={false} hasShadow={false}>
          <EuiTitle size="xxs">
            <h3>
              <FormattedMessage
                defaultMessage="Supported file formats and size"
                id="xpack.securitySolution.entityAnalytics.entityResolutionUpload.fileFormatTitle"
              />
            </h3>
          </EuiTitle>
          <EuiSpacer size="s" />
          <ul className={listStyle}>
            <li>
              <FormattedMessage
                defaultMessage="File formats: {formats}"
                id="xpack.securitySolution.entityAnalytics.entityResolutionUpload.acceptedFormats"
                values={{ formats: SUPPORTED_FILE_EXTENSIONS.join(', ') }}
              />
            </li>
            <li>
              <FormattedMessage
                defaultMessage="Maximum file size: {maxFileSize}"
                id="xpack.securitySolution.entityAnalytics.entityResolutionUpload.maxFileSize"
                values={{ maxFileSize: formatBytes(MAX_FILE_SIZE_BYTES) }}
              />
            </li>
          </ul>

          <EuiTitle size="xxs">
            <h3>
              <FormattedMessage
                defaultMessage="Required file structure"
                id="xpack.securitySolution.entityAnalytics.entityResolutionUpload.structureTitle"
              />
            </h3>
          </EuiTitle>
          <EuiSpacer size="s" />
          <ul className={listStyle}>
            <li>
              <FormattedMessage
                defaultMessage="Header row with column names"
                id="xpack.securitySolution.entityAnalytics.entityResolutionUpload.headerRow"
              />
            </li>
            <li>
              <FormattedMessage
                defaultMessage="{type}: Entity type — {values}"
                id="xpack.securitySolution.entityAnalytics.entityResolutionUpload.typeColumn"
                values={{
                  type: <b>{'type'}</b>,
                  values: 'user, host, service',
                }}
              />
            </li>
            <li>
              <FormattedMessage
                defaultMessage="{resolvedTo}: The {entityId} of the primary entity"
                id="xpack.securitySolution.entityAnalytics.entityResolutionUpload.resolvedToColumn"
                values={{
                  resolvedTo: <b>{'resolved_to'}</b>,
                  entityId: <b>{'entity.id'}</b>,
                }}
              />
            </li>
            <li>
              <FormattedMessage
                defaultMessage="Additional columns: Identity fields used to match entities (e.g., {fields})"
                id="xpack.securitySolution.entityAnalytics.entityResolutionUpload.identityColumns"
                values={{
                  fields: 'user.email, user.name, host.name',
                }}
              />
            </li>
          </ul>

          <EuiTitle size="xxs">
            <h3>
              <FormattedMessage
                defaultMessage="Example"
                id="xpack.securitySolution.entityAnalytics.entityResolutionUpload.exampleTitle"
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
          data-test-subj="entity-resolution-file-picker"
          accept={SUPPORTED_FILE_TYPES.join(',')}
          fullWidth
          onChange={onFileChange}
          isInvalid={!!errorMessage}
          isLoading={isLoading}
          aria-label={i18n.translate(
            'xpack.securitySolution.entityAnalytics.entityResolutionUpload.filePickerAriaLabel',
            { defaultMessage: 'Entity resolution file picker' }
          )}
        />
        <br />
        {errorMessage && (
          <EuiText color="danger" size="xs">
            {errorMessage}
          </EuiText>
        )}
      </>
    );
  }
);

EntityResolutionFilePickerStep.displayName = 'EntityResolutionFilePickerStep';
