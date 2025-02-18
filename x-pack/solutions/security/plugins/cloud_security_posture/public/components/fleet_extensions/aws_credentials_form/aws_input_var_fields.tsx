/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { Suspense } from 'react';
import { EuiFieldText, EuiFormRow, EuiSpacer, EuiLoadingSpinner } from '@elastic/eui';
import { PackageInfo } from '@kbn/fleet-plugin/common';
import { css } from '@emotion/react';
import { LazyPackagePolicyInputVarField } from '@kbn/fleet-plugin/public';
import { i18n } from '@kbn/i18n';
import { AwsOptions } from './get_aws_credentials_form_options';
import { findVariableDef, fieldIsInvalid } from '../utils';

export const AwsInputVarFields = ({
  fields,
  onChange,
  packageInfo,
  hasInvalidRequiredVars = false,
}: {
  fields: Array<
    AwsOptions[keyof AwsOptions]['fields'][number] & {
      value: string;
      id: string;
      dataTestSubj: string;
    }
  >;
  onChange: (key: string, value: string) => void;
  packageInfo: PackageInfo;
  hasInvalidRequiredVars?: boolean;
}) => {
  return (
    <div>
      {fields.map((field, index) => {
        const invalid = fieldIsInvalid(field.value, hasInvalidRequiredVars);
        const invalidError = i18n.translate('xpack.csp.cspmIntegration.integration.fieldRequired', {
          defaultMessage: '{field} is required',
          values: {
            field: field.label,
          },
        });
        return (
          <div key={index}>
            {field.type === 'password' && field.isSecret === true && (
              <>
                <EuiSpacer size="m" />
                <div
                  css={css`
                    width: 100%;
                    .euiFormControlLayout,
                    .euiFormControlLayout__childrenWrapper,
                    .euiFormRow,
                    input {
                      max-width: 100%;
                      width: 100%;
                    }
                  `}
                >
                  <Suspense fallback={<EuiLoadingSpinner size="l" />}>
                    <LazyPackagePolicyInputVarField
                      varDef={{
                        ...findVariableDef(packageInfo, field.id)!,
                        required: true,
                        type: 'password',
                      }}
                      value={field.value || ''}
                      onChange={(value) => {
                        onChange(field.id, value);
                      }}
                      errors={invalid ? [invalidError] : []}
                      forceShowErrors={invalid}
                      isEditPage={true}
                      data-test-subj={field.dataTestSubj}
                    />
                  </Suspense>
                </div>
                <EuiSpacer size="m" />
              </>
            )}
            {field.type === 'text' && (
              <EuiFormRow
                key={field.id}
                label={field.label}
                isInvalid={invalid}
                error={invalid ? invalidError : undefined}
                fullWidth
                hasChildLabel={true}
                id={field.id}
              >
                <EuiFieldText
                  id={field.id}
                  fullWidth
                  value={field.value || ''}
                  isInvalid={invalid}
                  onChange={(event) => onChange(field.id, event.target.value)}
                  data-test-subj={field.dataTestSubj}
                />
              </EuiFormRow>
            )}
          </div>
        );
      })}
    </div>
  );
};
