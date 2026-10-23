/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React, { Suspense } from 'react';
import { css } from '@emotion/react';
import {
  EuiFieldText,
  EuiForm,
  EuiFormRow,
  EuiLoadingSpinner,
  EuiSelect,
  EuiSpacer,
} from '@elastic/eui';
import { LazyPackagePolicyInputVarField } from '@kbn/fleet-plugin/public';
import type { PackageInfo } from '@kbn/fleet-plugin/common';
import { i18n } from '@kbn/i18n';
import { GCP_INPUT_FIELDS_TEST_SUBJECTS } from '@kbn/cloud-security-posture-common';
import { fieldIsInvalid, findVariableDef, gcpField } from '../utils';
import { GCP_CREDENTIALS_TYPE } from '../constants';
import type { GcpFields, GcpInputFields } from '../types';

const credentialOptionsList = [
  {
    text: i18n.translate(
      'securitySolutionPackages.cloudSecurityPosture.cloudSetup.gcp.credentialsFileOption',
      {
        defaultMessage: 'Credentials File',
      }
    ),
    value: GCP_CREDENTIALS_TYPE.CREDENTIALS_FILE,
    'data-test-subj': 'credentials_file_option_test_id',
  },
  {
    text: i18n.translate(
      'securitySolutionPackages.cloudSecurityPosture.cloudSetup.gcp.credentialsJsonOption',
      {
        defaultMessage: 'Credentials JSON',
      }
    ),
    value: GCP_CREDENTIALS_TYPE.CREDENTIALS_JSON,
    'data-test-subj': 'credentials_json_option_test_id',
  },
];

// eslint-disable-next-line complexity
export const GcpInputVarFields = ({
  fields,
  onChange,
  isOrganization,
  disabled,
  packageInfo,
  isEditPage,
  hasInvalidRequiredVars,
}: {
  fields: Array<GcpFields[keyof GcpFields] & { value: string; id: string }>;
  onChange: (key: string, value: string) => void;
  isOrganization: boolean;
  disabled: boolean;
  packageInfo: PackageInfo;
  isEditPage?: boolean;
  hasInvalidRequiredVars: boolean;
}) => {
  const getFieldById = (id: keyof GcpInputFields['fields']) => {
    return fields.find((element) => element.id === id);
  };

  const organizationIdFields = getFieldById('gcp.organization_id');

  const projectIdFields = getFieldById('gcp.project_id');

  const credentialsTypeFields = getFieldById('gcp.credentials.type');

  const credentialFilesFields = getFieldById('gcp.credentials.file');
  const credentialFilesFieldsInvalid = fieldIsInvalid(
    credentialFilesFields?.value,
    hasInvalidRequiredVars
  );
  const credentialFilesError = i18n.translate(
    'securitySolutionPackages.cloudSecurityPosture.cloudSetup.fieldRequired.',
    {
      defaultMessage: '{field} is required',
      values: {
        field: credentialFilesFields?.label,
      },
    }
  );

  const credentialJSONFields = getFieldById('gcp.credentials.json');
  const credentialsJsonFieldDef = credentialJSONFields
    ? findVariableDef(packageInfo, credentialJSONFields?.id)
    : undefined;
  const credentialJSONFieldsInvalid = fieldIsInvalid(
    credentialJSONFields?.value,
    hasInvalidRequiredVars
  );
  const credentialJSONError = i18n.translate(
    'securitySolutionPackages.cloudSecurityPosture.cloudSetup.fieldRequired.',
    {
      defaultMessage: '{field} is required',
      values: {
        field: credentialJSONFields?.label,
      },
    }
  );

  const credentialFieldValue = credentialOptionsList[0].value;
  const credentialJSONValue = credentialOptionsList[1].value;

  const credentialsTypeValue =
    credentialsTypeFields?.value ||
    (credentialFilesFields && credentialFieldValue) ||
    (credentialJSONFields && credentialJSONValue);

  return (
    <div>
      <EuiForm component="form">
        {organizationIdFields && isOrganization && (
          <EuiFormRow fullWidth label={gcpField.fields['gcp.organization_id'].label}>
            <EuiFieldText
              disabled={disabled}
              data-test-subj={GCP_INPUT_FIELDS_TEST_SUBJECTS.ORGANIZATION_ID}
              id={organizationIdFields.id}
              fullWidth
              value={organizationIdFields.value || ''}
              onChange={(event) => onChange(organizationIdFields.id, event.target.value)}
            />
          </EuiFormRow>
        )}
        {projectIdFields && (
          <EuiFormRow fullWidth label={gcpField.fields['gcp.project_id'].label}>
            <EuiFieldText
              disabled={disabled}
              data-test-subj={GCP_INPUT_FIELDS_TEST_SUBJECTS.PROJECT_ID}
              id={projectIdFields.id}
              fullWidth
              value={projectIdFields.value || ''}
              onChange={(event) => onChange(projectIdFields.id, event.target.value)}
            />
          </EuiFormRow>
        )}
        {credentialsTypeFields && credentialFilesFields && credentialJSONFields && (
          <EuiFormRow fullWidth label={gcpField.fields['gcp.credentials.type'].label}>
            <EuiSelect
              data-test-subj={GCP_INPUT_FIELDS_TEST_SUBJECTS.CREDENTIALS_TYPE}
              fullWidth
              options={credentialOptionsList}
              value={credentialsTypeFields?.value || credentialOptionsList[0].value}
              onChange={(optionElem) => {
                onChange(credentialsTypeFields?.id, optionElem.target.value);
              }}
            />
          </EuiFormRow>
        )}
        {credentialsTypeValue === credentialFieldValue && credentialFilesFields && (
          <EuiFormRow
            fullWidth
            label={gcpField.fields['gcp.credentials.file'].label}
            isInvalid={credentialFilesFieldsInvalid}
            error={credentialFilesFieldsInvalid ? credentialFilesError : undefined}
          >
            <EuiFieldText
              data-test-subj={GCP_INPUT_FIELDS_TEST_SUBJECTS.CREDENTIALS_FILE}
              id={credentialFilesFields.id}
              fullWidth
              value={credentialFilesFields.value || ''}
              onChange={(event) => onChange(credentialFilesFields.id, event.target.value)}
              isInvalid={credentialFilesFieldsInvalid}
            />
          </EuiFormRow>
        )}
        {credentialsTypeValue === credentialJSONValue &&
          credentialJSONFields &&
          credentialsJsonFieldDef && (
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
              <EuiSpacer size="m" />
              <EuiFormRow
                fullWidth
                label={gcpField.fields['gcp.credentials.json'].label}
                isInvalid={credentialJSONFieldsInvalid}
                error={credentialJSONFieldsInvalid ? credentialJSONError : undefined}
                data-test-subj={GCP_INPUT_FIELDS_TEST_SUBJECTS.CREDENTIALS_JSON_SECRET_PANEL}
              >
                <Suspense fallback={<EuiLoadingSpinner size="l" />}>
                  <LazyPackagePolicyInputVarField
                    data-test-subj={GCP_INPUT_FIELDS_TEST_SUBJECTS.CREDENTIALS_JSON}
                    varDef={{
                      ...credentialsJsonFieldDef,
                      required: true,
                      type: 'textarea',
                      secret: true,
                      full_width: true,
                    }}
                    value={credentialJSONFields.value || ''}
                    onChange={(value) => {
                      onChange(credentialJSONFields.id, value);
                    }}
                    isEditPage={isEditPage}
                  />
                </Suspense>
              </EuiFormRow>
            </div>
          )}
      </EuiForm>
    </div>
  );
};
