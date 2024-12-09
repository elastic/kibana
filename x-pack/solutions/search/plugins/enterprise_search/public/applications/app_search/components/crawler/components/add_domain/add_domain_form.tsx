/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';

import { useActions, useValues } from 'kea';

import {
  EuiButton,
  EuiCode,
  EuiFlexGroup,
  EuiFlexItem,
  EuiForm,
  EuiFormRow,
  EuiFieldText,
  EuiSpacer,
  EuiText,
} from '@elastic/eui';

import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';

import { AddDomainLogic } from './add_domain_logic';
import { AddDomainValidation } from './add_domain_validation';

export const AddDomainForm: React.FC = () => {
  const { setAddDomainFormInputValue, startDomainValidation } = useActions(AddDomainLogic);

  const { addDomainFormInputValue, displayValidation, entryPointValue } = useValues(AddDomainLogic);

  return (
    <>
      <EuiForm
        onSubmit={(event) => {
          event.preventDefault();
          startDomainValidation();
        }}
        component="form"
      >
        <EuiFormRow
          fullWidth
          label={i18n.translate('xpack.enterpriseSearch.appSearch.crawler.addDomainForm.urlLabel', {
            defaultMessage: 'Domain URL',
          })}
          helpText={
            <EuiText size="s">
              {i18n.translate(
                'xpack.enterpriseSearch.appSearch.crawler.addDomainForm.urlHelpText',
                {
                  defaultMessage: 'Domain URLs require a protocol and cannot contain any paths.',
                }
              )}
            </EuiText>
          }
        >
          <EuiFlexGroup>
            <EuiFlexItem grow>
              <EuiFieldText
                autoFocus
                placeholder="https://"
                value={addDomainFormInputValue}
                onChange={(e) => setAddDomainFormInputValue(e.target.value)}
                fullWidth
              />
            </EuiFlexItem>
            <EuiFlexItem grow={false}>
              <EuiButton type="submit" fill disabled={addDomainFormInputValue.length === 0}>
                {i18n.translate(
                  'xpack.enterpriseSearch.appSearch.crawler.addDomainForm.validateButtonLabel',
                  {
                    defaultMessage: 'Validate Domain',
                  }
                )}
              </EuiButton>
            </EuiFlexItem>
          </EuiFlexGroup>
        </EuiFormRow>

        {entryPointValue !== '/' && (
          <>
            <EuiSpacer />
            <EuiText size="s">
              <p>
                <strong>
                  <FormattedMessage
                    id="xpack.enterpriseSearch.appSearch.crawler.addDomainForm.entryPointLabel"
                    defaultMessage="Web Crawler entry point has been set as {entryPointValue}"
                    values={{
                      entryPointValue: <EuiCode>{entryPointValue}</EuiCode>,
                    }}
                  />
                </strong>
              </p>
            </EuiText>
          </>
        )}

        {displayValidation && <AddDomainValidation />}
      </EuiForm>
    </>
  );
};
