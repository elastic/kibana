/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React, { Suspense } from 'react';
import { EuiFieldText, EuiFormRow, EuiSpacer, EuiLoadingSpinner } from '@elastic/eui';
import type { PackageInfo } from '@kbn/fleet-plugin/common';
import { css } from '@emotion/react';
import { i18n } from '@kbn/i18n';
import { LazyPackagePolicyInputVarField } from '@kbn/fleet-plugin/public';
import type { AzureOptions } from './get_azure_credentials_form_options';
import { fieldIsInvalid, findVariableDef } from '../utils';

export const AzureInputVarFields = ({
  fields,
  packageInfo,
  onChange,
  hasInvalidRequiredVars,
}: {
  fields: Array<AzureOptions[keyof AzureOptions]['fields'][number] & { value: string; id: string }>;
  packageInfo: PackageInfo;
  onChange: (key: string, value: string) => void;
  hasInvalidRequiredVars: boolean;
}) => {
  return (
    <div>
      {fields.map((field, index) => {
        if (!field) {
          return null;
        }

        const invalid = fieldIsInvalid(field.value, hasInvalidRequiredVars);
        const invalidError = i18n.translate(
          'securitySolutionPackages.cloudSecurityPosture.cloudSetup.fieldRequired.',
          {
            defaultMessage: '{field} is required',
            values: {
              field: field.label,
            },
          }
        );
        return (
          <div key={index}>
            {field.isSecret && field.type && (
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
                        // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
                        ...findVariableDef(packageInfo, field.id)!,
                        required: true,
                        type: field.type,
                      }}
                      value={field.value || ''}
                      onChange={(value) => {
                        onChange(field.id, value);
                      }}
                      errors={invalid ? [invalidError] : []}
                      forceShowErrors={invalid}
                      isEditPage={true}
                    />
                  </Suspense>
                </div>
              </>
            )}
            {field.type === 'text' && !field.isSecret && (
              <>
                <EuiSpacer size="m" />
                <EuiFormRow
                  key={field.id}
                  label={field.label}
                  fullWidth
                  hasChildLabel={true}
                  id={field.id}
                  isInvalid={invalid}
                  error={invalid ? invalidError : undefined}
                >
                  <EuiFieldText
                    id={field.id}
                    fullWidth
                    value={field.value || ''}
                    onChange={(event) => onChange(field.id, event.target.value)}
                    data-test-subj={field.testSubj}
                    isInvalid={invalid}
                  />
                </EuiFormRow>
                <EuiSpacer size="s" />
              </>
            )}
          </div>
        );
      })}
    </div>
  );
};
