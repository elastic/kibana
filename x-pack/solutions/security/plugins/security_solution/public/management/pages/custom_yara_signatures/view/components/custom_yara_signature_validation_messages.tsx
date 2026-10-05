/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiFlexGroup, EuiFlexItem, EuiSpacer, EuiText } from '@elastic/eui';
import React, { memo } from 'react';
import type { ValidateCustomYaraSignatureDiagnostic } from '../../../../../../common/api/endpoint/custom_yara_signatures';
import { useTestIdGenerator } from '../../../../hooks/use_test_id_generator';
import { getValidationDiagnosticMessage, VALIDATION_REQUEST_ERROR } from './translations';

interface CustomYaraSignatureValidationMessagesProps {
  errors: ValidateCustomYaraSignatureDiagnostic[];
  warnings: ValidateCustomYaraSignatureDiagnostic[];
  requestError: unknown;
  'data-test-subj'?: string;
}

export const CustomYaraSignatureValidationMessages =
  memo<CustomYaraSignatureValidationMessagesProps>(
    ({ errors, warnings, requestError, 'data-test-subj': dataTestSubj }) => {
      const getTestId = useTestIdGenerator(dataTestSubj);
      const hasMessages = Boolean(requestError) || errors.length > 0 || warnings.length > 0;

      return (
        <div data-test-subj={getTestId()} aria-live="polite" aria-atomic="true">
          {hasMessages ? (
            <>
              <EuiSpacer size="s" />
              <EuiFlexGroup direction="column" gutterSize="xs">
                {requestError ? (
                  <EuiFlexItem grow={false}>
                    <EuiText color="danger" size="s" data-test-subj={getTestId('requestError')}>
                      <p>{VALIDATION_REQUEST_ERROR}</p>
                    </EuiText>
                  </EuiFlexItem>
                ) : null}

                {errors.map((diagnostic, index) => (
                  <EuiFlexItem grow={false} key={`error-${diagnostic.line}-${index}`}>
                    <EuiText color="danger" size="s" data-test-subj={getTestId('error')}>
                      <p>{getValidationDiagnosticMessage(diagnostic)}</p>
                    </EuiText>
                  </EuiFlexItem>
                ))}

                {warnings.map((diagnostic, index) => (
                  <EuiFlexItem grow={false} key={`warning-${diagnostic.line}-${index}`}>
                    <EuiText color="warning" size="s" data-test-subj={getTestId('warning')}>
                      <p>{getValidationDiagnosticMessage(diagnostic)}</p>
                    </EuiText>
                  </EuiFlexItem>
                ))}
              </EuiFlexGroup>
            </>
          ) : null}
        </div>
      );
    }
  );

CustomYaraSignatureValidationMessages.displayName = 'CustomYaraSignatureValidationMessages';
