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
  // Helper styles for password fields
  const passwordFieldStyles = css`
    width: 100%;
    .euiFormControlLayout,
    .euiFormControlLayout__childrenWrapper,
    .euiFormRow,
    input {
      max-width: 100%;
      width: 100%;
    }
  `;

  // Helper to get error message
  const getInvalidError = (label: string) =>
    i18n.translate('xpack.csp.cspmIntegration.integration.fieldRequired', {
      defaultMessage: '{field} is required',
      values: { field: label },
    });

  const awsFields = fields.map((field) => {
    const varDef = findVariableDef(packageInfo, field.id);
    if (varDef) {
      return {
        ...field,
        varDef,
        dataTestSubj: field.dataTestSubj || `awsInputVarField-${field.id}`,
      };
    }
    return null;
  });

  return (
    <div>
      {awsFields.map((field) => {
        if (!field) {
          return null; // Skip fields that do not have a variable definition
        }
        const invalid = fieldIsInvalid(field.value, hasInvalidRequiredVars);
        const invalidError = getInvalidError(field.label);

        if (field.type === 'password' && field.isSecret === true) {
          return (
            <React.Fragment key={field.id}>
              <EuiSpacer size="m" />
              <div css={passwordFieldStyles}>
                <Suspense fallback={<EuiLoadingSpinner size="l" />}>
                  <LazyPackagePolicyInputVarField
                    varDef={field.varDef}
                    value={field.value || ''}
                    onChange={(value) => onChange(field.id, value)}
                    errors={invalid ? [invalidError] : []}
                    forceShowErrors={invalid}
                    isEditPage={true}
                    data-test-subj={field.dataTestSubj}
                  />
                </Suspense>
              </div>
              <EuiSpacer size="m" />
            </React.Fragment>
          );
        }

        if (field.type === 'text') {
          return (
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
          );
        }

        return null;
      })}
    </div>
  );
};
