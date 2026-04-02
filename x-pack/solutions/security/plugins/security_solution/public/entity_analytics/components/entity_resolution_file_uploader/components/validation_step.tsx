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
  EuiCodeBlock,
  EuiFlexGroup,
  EuiFlexItem,
  EuiIcon,
  EuiSpacer,
  EuiText,
  EuiTitle,
} from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n-react';
import type { ValidatedFile } from '../types';

interface ValidationStepProps {
  validatedFile: ValidatedFile;
  isLoading: boolean;
  onReturn: () => void;
  onConfirm: () => void;
}

export const EntityResolutionValidationStep: React.FC<ValidationStepProps> = React.memo(
  ({ validatedFile, isLoading, onReturn, onConfirm }) => {
    const hasValidLines = validatedFile.validLines.count > 0;
    const hasInvalidLines = validatedFile.invalidLines.count > 0;

    return (
      <>
        <EuiSpacer size="m" />
        {hasValidLines && (
          <>
            <EuiFlexGroup alignItems="center" gutterSize="s">
              <EuiFlexItem grow={false}>
                <EuiIcon type="checkInCircleFilled" color="success" />
              </EuiFlexItem>
              <EuiFlexItem grow={false}>
                <EuiTitle size="xxs">
                  <h4>
                    <FormattedMessage
                      defaultMessage="{count} valid {count, plural, one {row} other {rows}}"
                      id="xpack.securitySolution.entityAnalytics.entityResolutionUpload.validRowCount"
                      values={{ count: validatedFile.validLines.count }}
                    />
                  </h4>
                </EuiTitle>
              </EuiFlexItem>
            </EuiFlexGroup>
            <EuiSpacer size="s" />
            <EuiCodeBlock
              language="csv"
              paddingSize="s"
              lineNumbers
              overflowHeight={200}
              isCopyable
            >
              {validatedFile.validLines.text}
            </EuiCodeBlock>
            <EuiSpacer size="m" />
          </>
        )}

        {hasInvalidLines && (
          <>
            <EuiFlexGroup alignItems="center" gutterSize="s">
              <EuiFlexItem grow={false}>
                <EuiIcon type="error" color="danger" />
              </EuiFlexItem>
              <EuiFlexItem grow={false}>
                <EuiTitle size="xxs">
                  <h4>
                    <FormattedMessage
                      defaultMessage="{count} invalid {count, plural, one {row} other {rows}}"
                      id="xpack.securitySolution.entityAnalytics.entityResolutionUpload.invalidRowCount"
                      values={{ count: validatedFile.invalidLines.count }}
                    />
                  </h4>
                </EuiTitle>
              </EuiFlexItem>
            </EuiFlexGroup>
            <EuiSpacer size="s" />
            <EuiText size="xs" color="subdued">
              <FormattedMessage
                defaultMessage="The following rows have validation errors and will be skipped during upload:"
                id="xpack.securitySolution.entityAnalytics.entityResolutionUpload.invalidRowsDescription"
              />
            </EuiText>
            <EuiSpacer size="s" />
            <EuiCodeBlock language="csv" paddingSize="s" lineNumbers overflowHeight={200}>
              {validatedFile.invalidLines.text}
            </EuiCodeBlock>
            <EuiSpacer size="s" />
            {validatedFile.invalidLines.errors.map((error) => (
              <EuiText key={error.index} size="xs" color="danger">
                {`Row ${error.index}: ${error.message}`}
              </EuiText>
            ))}
            <EuiSpacer size="m" />
          </>
        )}

        <EuiFlexGroup justifyContent="flexEnd" gutterSize="s">
          <EuiFlexItem grow={false}>
            <EuiButtonEmpty onClick={onReturn} disabled={isLoading}>
              <FormattedMessage
                defaultMessage="Back"
                id="xpack.securitySolution.entityAnalytics.entityResolutionUpload.backButton"
              />
            </EuiButtonEmpty>
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            <EuiButton onClick={onConfirm} isLoading={isLoading} isDisabled={!hasValidLines} fill>
              <FormattedMessage
                defaultMessage="Upload {count} {count, plural, one {row} other {rows}}"
                id="xpack.securitySolution.entityAnalytics.entityResolutionUpload.uploadButton"
                values={{ count: validatedFile.validLines.count }}
              />
            </EuiButton>
          </EuiFlexItem>
        </EuiFlexGroup>
      </>
    );
  }
);

EntityResolutionValidationStep.displayName = 'EntityResolutionValidationStep';
