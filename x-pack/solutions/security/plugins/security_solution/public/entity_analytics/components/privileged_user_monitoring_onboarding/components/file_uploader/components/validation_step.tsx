/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  EuiButton,
  EuiButtonEmpty,
  EuiCodeBlock,
  EuiFlexGroup,
  EuiFlexItem,
  EuiIcon,
  EuiSpacer,
  useEuiTheme,
} from '@elastic/eui';
import { css } from '@emotion/react';
import React from 'react';
import { FormattedMessage } from '@kbn/i18n-react';
import { EntityEventTypes } from '../../../../../../common/lib/telemetry';
import { useKibana } from '../../../../../../common/lib/kibana';
import { downloadBlob } from '../../../../../../common/utils/download_blob';
import type { ValidatedFile } from '../types';
import { buildAnnotationsFromError } from '../helpers';

export interface PrivilegedUserMonitoringValidationStepProps {
  validatedFile: ValidatedFile;
  isLoading: boolean;
  onConfirm: () => void;
  onReturn: () => void;
}

const CODE_BLOCK_HEIGHT = 250;
const INVALID_FILE_NAME = `invalid_privileged_user_monitoring.csv`;

export const PrivilegedUserMonitoringValidationStep: React.FC<PrivilegedUserMonitoringValidationStepProps> =
  React.memo(({ validatedFile, isLoading, onConfirm, onReturn }) => {
    const { validLines, invalidLines, size: fileSize, name: fileName } = validatedFile;
    const { euiTheme } = useEuiTheme();
    const { telemetry } = useKibana().services;
    const annotations = buildAnnotationsFromError(invalidLines.errors);

    const onConfirmClick = () => {
      telemetry.reportEvent(EntityEventTypes.PrivilegedUserMonitoringCsvImported, {
        file: {
          size: fileSize,
        },
      });
      onConfirm();
    };

    return (
      <>
        <b>
          <FormattedMessage
            defaultMessage="{fileName} preview"
            id="xpack.securitySolution.entityAnalytics.privilegedUserMonitoring.validationStep.fileNamePreviewText"
            values={{ fileName }}
          />
        </b>
        <EuiSpacer size="m" />
        {validLines.count > 0 && (
          <>
            <EuiFlexGroup alignItems="baseline">
              <EuiFlexItem grow>
                <EuiFlexGroup gutterSize="s">
                  <EuiFlexItem grow={false}>
                    <EuiIcon type={'checkInCircleFilled'} color="success" />
                  </EuiFlexItem>
                  <EuiFlexItem grow={false}>
                    <span data-test-subj="privileged-user-monitoring-validLinesMessage">
                      <FormattedMessage
                        id="xpack.securitySolution.entityAnalytics.privilegedUserMonitoring.validationStep.validLinesMessage"
                        defaultMessage="{validLinesCount, plural, one {{validLinesCountBold} user will be assigned} other {{validLinesCountBold} users will be assigned}}"
                        values={{
                          validLinesCount: validLines.count,
                          validLinesCountBold: <b>{validLines.count}</b>,
                        }}
                      />
                    </span>
                  </EuiFlexItem>
                </EuiFlexGroup>
              </EuiFlexItem>

              <EuiFlexItem grow={false}>
                <EuiButtonEmpty flush="right" onClick={onReturn} size="xs" disabled={isLoading}>
                  <FormattedMessage
                    id="xpack.securitySolution.entityAnalytics.privilegedUserMonitoring.validationStep.chooseAnotherFileText"
                    defaultMessage="Choose another file"
                  />
                </EuiButtonEmpty>
              </EuiFlexItem>
            </EuiFlexGroup>
            <EuiSpacer size="xs" />
            <EuiCodeBlock
              overflowHeight={CODE_BLOCK_HEIGHT}
              lineNumbers
              language="CSV"
              isVirtualized
              css={css`
                border: ${euiTheme.border.width.thin} solid ${euiTheme.colors.accentSecondary};
              `}
            >
              {validLines.text}
            </EuiCodeBlock>
            <EuiSpacer size="l" />
          </>
        )}

        {invalidLines.count > 0 && (
          <>
            <EuiFlexGroup alignItems="baseline">
              <EuiFlexItem grow>
                <EuiFlexGroup gutterSize="s">
                  <EuiFlexItem grow={false}>
                    <EuiIcon type={'error'} color="danger" />
                  </EuiFlexItem>
                  <EuiFlexItem grow={false}>
                    <span data-test-subj="privileged-user-monitoring-invalidLinesMessage">
                      <FormattedMessage
                        id="xpack.securitySolution.entityAnalytics.privilegedUserMonitoring.validationStep.invalidLinesMessage"
                        defaultMessage="{invalidLinesCount, plural, one {{invalidLinesCountBold} row is invalid and won't be added} other {{invalidLinesCountBold} rows are invalid and won’t be added}}"
                        values={{
                          invalidLinesCount: invalidLines.count,
                          invalidLinesCountBold: <b>{invalidLines.count}</b>,
                        }}
                      />
                    </span>
                  </EuiFlexItem>
                </EuiFlexGroup>
              </EuiFlexItem>

              <EuiFlexItem grow={false}>
                {invalidLines.text && (
                  <EuiButtonEmpty
                    size="xs"
                    flush="right"
                    disabled={isLoading}
                    onClick={() => {
                      if (invalidLines.text.length > 0) {
                        downloadBlob(new Blob([invalidLines.text]), INVALID_FILE_NAME);
                      }
                    }}
                  >
                    <FormattedMessage
                      id="xpack.securitySolution.entityAnalytics.privilegedUserMonitoring.validationStep.downloadCSV"
                      defaultMessage="Download CSV"
                    />
                  </EuiButtonEmpty>
                )}
              </EuiFlexItem>
            </EuiFlexGroup>

            <EuiSpacer size="s" />
            <EuiCodeBlock
              overflowHeight={CODE_BLOCK_HEIGHT}
              lineNumbers={{ annotations }}
              language="CSV"
              isVirtualized
              css={css`
                border: 1px solid ${euiTheme.colors.danger};
              `}
            >
              {invalidLines.text}
            </EuiCodeBlock>
          </>
        )}

        <EuiSpacer size="m" />

        <EuiFlexGroup justifyContent="spaceBetween" alignItems="baseline">
          <EuiFlexItem grow={false}>
            <EuiButtonEmpty onClick={onReturn} disabled={isLoading}>
              <FormattedMessage
                id="xpack.securitySolution.entityAnalytics.privilegedUserMonitoring.validationStep.backButtonText"
                defaultMessage="Back"
              />
            </EuiButtonEmpty>
          </EuiFlexItem>

          <EuiFlexItem grow={false}>
            <EuiButton
              fill
              onClick={onConfirmClick}
              disabled={validLines.count === 0}
              data-test-subj="privileged-user-monitoring-assign-button"
              isLoading={isLoading}
            >
              <FormattedMessage
                id="xpack.securitySolution.entityAnalytics.privilegedUserMonitoring.validationStep.addButtonText"
                defaultMessage="Add privileged users"
              />
            </EuiButton>
          </EuiFlexItem>
        </EuiFlexGroup>
      </>
    );
  });

PrivilegedUserMonitoringValidationStep.displayName = 'privilegedUserMonitoring.validationStep';
