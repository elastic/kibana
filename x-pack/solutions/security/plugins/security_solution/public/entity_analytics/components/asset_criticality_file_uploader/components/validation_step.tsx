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
  EuiHorizontalRule,
  EuiIcon,
  EuiSpacer,
  useEuiTheme,
} from '@elastic/eui';
import { css } from '@emotion/react';
import React from 'react';
import { FormattedMessage } from '@kbn/i18n-react';
import { downloadBlob } from '../../../../common/utils/download_blob';
import { useKibana } from '../../../../common/lib/kibana/kibana_react';
import type { ValidatedFile } from '../types';
import { buildAnnotationsFromError } from '../helpers';
import { EntityEventTypes } from '../../../../common/lib/telemetry';

export interface AssetCriticalityValidationStepProps {
  validatedFile: ValidatedFile;
  isLoading: boolean;
  onConfirm: () => void;
  onReturn: () => void;
}

const CODE_BLOCK_HEIGHT = 250;
const INVALID_FILE_NAME = `invalid_asset_criticality.csv`;

export const AssetCriticalityValidationStep: React.FC<AssetCriticalityValidationStepProps> =
  React.memo(({ validatedFile, isLoading, onConfirm, onReturn }) => {
    const { validLines, invalidLines, size: fileSize, name: fileName } = validatedFile;
    const { euiTheme } = useEuiTheme();
    const { telemetry } = useKibana().services;
    const annotations = buildAnnotationsFromError(invalidLines.errors);

    const onConfirmClick = () => {
      telemetry.reportEvent(EntityEventTypes.AssetCriticalityCsvImported, {
        file: {
          size: fileSize,
        },
      });
      onConfirm();
    };

    return (
      <>
        <EuiSpacer size="l" />

        <FormattedMessage
          defaultMessage="{fileName} preview"
          id="xpack.securitySolution.entityAnalytics.assetCriticalityValidationStep.fileNamePreviewText"
          values={{ fileName }}
        />
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
                    <span data-test-subj="asset-criticality-validLinesMessage">
                      <FormattedMessage
                        id="xpack.securitySolution.entityAnalytics.assetCriticalityValidationStep.validLinesMessage"
                        defaultMessage="{validLinesCount, plural, one {{validLinesCountBold} asset criticality level will be assigned} other {{validLinesCountBold} asset criticality levels will be assigned}}"
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
                    id="xpack.securitySolution.entityAnalytics.assetCriticalityValidationStep.chooseAnotherFileText"
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
                    <span data-test-subj="asset-criticality-invalidLinesMessage">
                      <FormattedMessage
                        id="xpack.securitySolution.entityAnalytics.assetCriticalityValidationStep.invalidLinesMessage"
                        defaultMessage="{invalidLinesCount, plural, one {{invalidLinesCountBold} line is invalid and won't be assigned} other {{invalidLinesCountBold} lines are invalid and won't be assigned}}"
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
                      id="xpack.securitySolution.entityAnalytics.assetCriticalityValidationStep.downloadCSV"
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
            <EuiSpacer size="l" />
          </>
        )}

        <EuiHorizontalRule />
        <EuiSpacer size="s" />

        <EuiFlexGroup justifyContent="spaceBetween" alignItems="baseline">
          <EuiFlexItem grow={false}>
            <EuiButtonEmpty onClick={onReturn} disabled={isLoading}>
              <FormattedMessage
                id="xpack.securitySolution.entityAnalytics.assetCriticalityValidationStep.backButtonText"
                defaultMessage="Back"
              />
            </EuiButtonEmpty>
          </EuiFlexItem>

          <EuiFlexItem grow={false}>
            <EuiButton
              fill
              onClick={onConfirmClick}
              disabled={validLines.count === 0}
              data-test-subj="asset-criticality-assign-button"
              isLoading={isLoading}
            >
              <FormattedMessage
                id="xpack.securitySolution.entityAnalytics.assetCriticalityValidationStep.assignButtonText"
                defaultMessage="Assign"
              />
            </EuiButton>
          </EuiFlexItem>
        </EuiFlexGroup>
      </>
    );
  });

AssetCriticalityValidationStep.displayName = 'AssetCriticalityValidationStep';
