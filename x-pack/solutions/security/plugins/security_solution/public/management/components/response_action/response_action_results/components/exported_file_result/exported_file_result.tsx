/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { memo } from 'react';
import type { EuiTextProps } from '@elastic/eui';
import { EuiButtonIcon, EuiCopy, EuiSpacer, EuiText, EuiToolTip } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';
import { KeyValueDisplay } from '../../../../key_value_display';
import { useTestIdGenerator } from '../../../../../hooks/use_test_id_generator';
import { FILE_PASSCODE_INFO_MESSAGE } from '../response_action_file_download_link/response_action_file_download_link';
import {
  RESPONSE_ACTIONS_ZIP_PASSCODE,
  type ResponseActionAgentType,
} from '../../../../../../../common/endpoint/service/response_actions/constants';
import type { ResponseActionExportedOutput } from '../../../../../../../common/endpoint/types';

const STORAGE_PROVIDER_LABEL = i18n.translate(
  'xpack.securitySolution.responseActionResults.exportedFileResult.storageProviderLabel',
  { defaultMessage: 'Storage provider' }
);

const TYPE_LABEL = i18n.translate(
  'xpack.securitySolution.responseActionResults.exportedFileResult.typeLabel',
  { defaultMessage: 'Type' }
);

const STORAGE_ACCOUNT_LABEL = i18n.translate(
  'xpack.securitySolution.responseActionResults.exportedFileResult.storageAccountLabel',
  { defaultMessage: 'Storage account' }
);

const CONTAINER_LABEL = i18n.translate(
  'xpack.securitySolution.responseActionResults.exportedFileResult.containerLabel',
  { defaultMessage: 'Container' }
);

const PATH_LABEL = i18n.translate(
  'xpack.securitySolution.responseActionResults.exportedFileResult.pathLabel',
  { defaultMessage: 'Path' }
);

const COPY_PATH_TOOLTIP = i18n.translate(
  'xpack.securitySolution.responseActionResults.exportedFileResult.copyPathTooltip',
  { defaultMessage: 'Copy path' }
);

const COPY_PATH_ARIA_LABEL = i18n.translate(
  'xpack.securitySolution.responseActionResults.exportedFileResult.copyPathAriaLabel',
  { defaultMessage: 'Copy path to clipboard' }
);

const FILE_NAME_LABEL = i18n.translate(
  'xpack.securitySolution.responseActionResults.exportedFileResult.fileNameLabel',
  { defaultMessage: 'File name' }
);

/**
 * Display names for the storage types Endpoint reports in `exported.service`. Types missing
 * here (ex. reported by a newer Endpoint) are shown as is.
 */
const STORAGE_TYPE_LABELS: Readonly<Record<string, string>> = Object.freeze({
  azure_blob: i18n.translate(
    'xpack.securitySolution.responseActionResults.exportedFileResult.azureBlobStorageTypeLabel',
    { defaultMessage: 'Azure Blob Storage' }
  ),
});

export interface ExportedFileResultProps {
  exported: ResponseActionExportedOutput;
  agentType: ResponseActionAgentType;
  /** Name of the file inside the uploaded zip (memory-dump only; older Endpoints don't report it) */
  fileName?: string;
  textSize?: EuiTextProps['size'];
  'data-test-subj'?: string;
}

/**
 * Shows where a response action uploaded its file (`outputs[agentId].content.exported`) and the zip passcode.
 */
export const ExportedFileResult = memo<ExportedFileResultProps>(
  ({ exported, agentType, fileName, textSize = 's', 'data-test-subj': dataTestSubj }) => {
    const getTestId = useTestIdGenerator(dataTestSubj);
    const { export: storageProvider, service, account, container, path } = exported;

    return (
      <EuiText size={textSize} data-test-subj={getTestId()}>
        <div>
          <FormattedMessage
            id="xpack.securitySolution.responseActionResults.exportedFileResult.uploadedDescription"
            defaultMessage="File was uploaded to external storage:"
          />
        </div>
        <EuiSpacer size="xs" />
        <KeyValueDisplay
          name={STORAGE_PROVIDER_LABEL}
          value={<span data-test-subj={getTestId('provider')}>{storageProvider}</span>}
        />
        <KeyValueDisplay
          name={TYPE_LABEL}
          value={
            <span data-test-subj={getTestId('type')}>
              {Object.hasOwn(STORAGE_TYPE_LABELS, service) ? STORAGE_TYPE_LABELS[service] : service}
            </span>
          }
        />
        <KeyValueDisplay
          name={STORAGE_ACCOUNT_LABEL}
          value={<span data-test-subj={getTestId('account')}>{account}</span>}
        />
        <KeyValueDisplay
          name={CONTAINER_LABEL}
          value={<span data-test-subj={getTestId('container')}>{container}</span>}
        />
        <KeyValueDisplay
          name={PATH_LABEL}
          value={
            <>
              <span data-test-subj={getTestId('path')}>{path}</span>{' '}
              <EuiCopy textToCopy={path}>
                {(copy) => (
                  <EuiToolTip content={COPY_PATH_TOOLTIP}>
                    <EuiButtonIcon
                      aria-label={COPY_PATH_ARIA_LABEL}
                      color="text"
                      iconType="copy"
                      iconSize="s"
                      onClick={copy}
                      data-test-subj={getTestId('copyPathButton')}
                    />
                  </EuiToolTip>
                )}
              </EuiCopy>
            </>
          }
        />
        {fileName && (
          <KeyValueDisplay
            name={FILE_NAME_LABEL}
            value={<span data-test-subj={getTestId('fileName')}>{fileName}</span>}
          />
        )}
        <EuiSpacer size="xs" />
        <div data-test-subj={getTestId('passcodeMessage')}>
          {FILE_PASSCODE_INFO_MESSAGE(RESPONSE_ACTIONS_ZIP_PASSCODE[agentType])}
        </div>
      </EuiText>
    );
  }
);
ExportedFileResult.displayName = 'ExportedFileResult';
