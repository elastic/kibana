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
import { useFormatBytes } from '../../../../../../common/components/formatted_bytes';
import { CRITICALITY_CSV_MAX_SIZE_BYTES } from '../../../../../../../common/constants';
import { SUPPORTED_FILE_EXTENSIONS, SUPPORTED_FILE_TYPES } from '../constants';
import { useUserLimitStatus } from '../../../../../hooks/use_privileged_monitoring_health';

interface PrivilegedUserMonitoringFilePickerStepProps {
  onFileChange: (fileList: FileList | null) => void;
  isLoading: boolean;
  errorMessage?: string;
}

const privilegedUserMonitoringCSVSample: string[] = [
  'superadmin',
  'admin01,Domain Admin',
  'sec_ops',
  'jdoe,IT Support',
];

export const PrivilegedUserMonitoringFilePickerStep: React.FC<PrivilegedUserMonitoringFilePickerStepProps> =
  React.memo(({ onFileChange, errorMessage, isLoading }) => {
    const formatBytes = useFormatBytes();
    const { euiTheme } = useEuiTheme();
    const { userStats } = useUserLimitStatus();
    const maxUsersAllowed = userStats?.maxAllowed ?? 10000; // fallback to default config value

    const listStyle = css`
      list-style-type: disc;
      margin-bottom: ${euiTheme.size.l};
      margin-left: ${euiTheme.size.l};
      line-height: ${useEuiFontSize('s').lineHeight};
    `;

    const sampleCSVContent = privilegedUserMonitoringCSVSample.join('\n');

    return (
      <>
        <EuiPanel color="subdued" paddingSize="l" grow={false} hasShadow={false}>
          <EuiTitle size="xxs">
            <h3>
              <FormattedMessage
                defaultMessage="Supported file formats and size"
                id="xpack.securitySolution.entityAnalytics.privilegedUserMonitoring.filePicker.csvFileFormatRequirements"
              />
            </h3>
          </EuiTitle>
          <EuiSpacer size="s" />

          <ul className={listStyle}>
            <li>
              <FormattedMessage
                defaultMessage="File formats: {formats}"
                id="xpack.securitySolution.entityAnalytics.privilegedUserMonitoring.filePicker.acceptedFileFormats"
                values={{
                  formats: SUPPORTED_FILE_EXTENSIONS.join(', '),
                }}
              />
            </li>
            <li>
              <FormattedMessage
                defaultMessage="Maximum file size: {maxFileSize}"
                id="xpack.securitySolution.entityAnalytics.privilegedUserMonitoring.filePicker.uploadFileSizeLimit"
                values={{
                  maxFileSize: formatBytes(CRITICALITY_CSV_MAX_SIZE_BYTES),
                }}
              />
            </li>
            <li>
              <FormattedMessage
                defaultMessage="Maximum number of privileged users: {maxUsers}"
                id="xpack.securitySolution.entityAnalytics.privilegedUserMonitoring.filePicker.maxUsersLimit"
                values={{
                  maxUsers: maxUsersAllowed,
                }}
              />
            </li>
          </ul>

          <EuiTitle size="xxs">
            <h3>
              <FormattedMessage
                defaultMessage="File structure"
                id="xpack.securitySolution.entityAnalytics.privilegedUserMonitoring.filePicker.CSVStructureTitle"
              />
            </h3>
          </EuiTitle>
          <EuiSpacer size="s" />

          <ul className={listStyle}>
            <li>
              <FormattedMessage
                defaultMessage="{field}: privileged user’s name"
                id="xpack.securitySolution.entityAnalytics.privilegedUserMonitoring.filePicker.userNameDescription"
                values={{
                  field: <code>{'user.name'}</code>,
                }}
              />
            </li>
            <li>
              <FormattedMessage
                defaultMessage="{field} (optional): user role, group, team, or similar"
                id="xpack.securitySolution.entityAnalytics.privilegedUserMonitoring.filePicker.userLabelDescription"
                values={{
                  field: <code>{'user.label'}</code>,
                }}
              />
            </li>
          </ul>

          <EuiTitle size="xxs">
            <h3>
              <FormattedMessage
                defaultMessage="Example"
                id="xpack.securitySolution.entityAnalytics.privilegedUserMonitoring.filePicker.exampleTitle"
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
            {sampleCSVContent}
          </EuiCodeBlock>
        </EuiPanel>

        <EuiSpacer size="l" />
        <EuiFilePicker
          data-test-subj="privileged-user-monitoring-file-picker"
          accept={SUPPORTED_FILE_TYPES.join(',')}
          fullWidth
          onChange={onFileChange}
          isInvalid={!!errorMessage}
          isLoading={isLoading}
          aria-label={i18n.translate(
            'xpack.securitySolution.entityAnalytics.privilegedUserMonitoring.filePicker.AriaLabel',
            {
              defaultMessage: 'Privileged user monitoring file picker',
            }
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
  });

PrivilegedUserMonitoringFilePickerStep.displayName = 'PrivilegedUserMonitoringFilePickerStep';
