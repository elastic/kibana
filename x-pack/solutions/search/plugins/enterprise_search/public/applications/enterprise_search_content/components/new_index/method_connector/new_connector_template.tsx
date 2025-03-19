/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { ChangeEvent } from 'react';

import { useValues, useActions } from 'kea';

import {
  EuiButton,
  EuiFieldText,
  EuiFlexGroup,
  EuiFlexItem,
  EuiForm,
  EuiFormRow,
  EuiLink,
  EuiSpacer,
  EuiText,
  EuiTitle,
} from '@elastic/eui';

import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';

import { INGESTION_METHOD_IDS } from '../../../../../../common/constants';

import { BetaConnectorCallout } from '../../../../shared/beta/beta_connector_callout';

import { BACK_BUTTON_LABEL } from '../../../../shared/constants';
import { docLinks } from '../../../../shared/doc_links';

import { NewConnectorLogic } from './new_connector_logic';

export interface Props {
  buttonLoading?: boolean;
  disabled?: boolean;
  docsUrl?: string;
  error?: string | React.ReactNode;
  isBeta?: boolean;
  onNameChange?(name: string): void;
  onSubmit(name: string): void;
  type: string;
}

export const NewConnectorTemplate: React.FC<Props> = ({
  buttonLoading,
  disabled,
  error,
  onNameChange,
  onSubmit,
  type,
  isBeta,
}) => {
  const { connectorName, rawName } = useValues(NewConnectorLogic);
  const { setRawName } = useActions(NewConnectorLogic);

  const handleNameChange = (e: ChangeEvent<HTMLInputElement>) => {
    setRawName(e.target.value);
    if (onNameChange) {
      onNameChange(connectorName);
    }
  };

  const formInvalid = !!error;

  return (
    <>
      <EuiForm
        component="form"
        id="enterprise-search-create-connector"
        onSubmit={(event) => {
          event.preventDefault();
          onSubmit(connectorName);
        }}
      >
        <EuiFlexGroup direction="column">
          {isBeta ? (
            <EuiFlexItem>
              <BetaConnectorCallout />
            </EuiFlexItem>
          ) : null}
          <EuiFlexItem>
            <EuiTitle size="s">
              <h3>
                <FormattedMessage
                  id="xpack.enterpriseSearch.content.newConnector.newConnectorTemplate.formTitle"
                  defaultMessage="Create a connector"
                />
              </h3>
            </EuiTitle>
          </EuiFlexItem>
          <EuiFlexItem grow>
            <EuiFlexGroup>
              <EuiFlexItem grow>
                <EuiFormRow
                  isDisabled={disabled || buttonLoading}
                  label={i18n.translate(
                    'xpack.enterpriseSearch.content.newConnector.newConnectorTemplate.nameInputLabel',
                    {
                      defaultMessage: 'Connector name',
                    }
                  )}
                  isInvalid={formInvalid}
                  fullWidth
                >
                  <EuiFieldText
                    data-test-subj="enterpriseSearchNewConnectorTemplateFieldText"
                    data-telemetry-id={`entSearchContent-${type}-newConnector-editName`}
                    placeholder={i18n.translate(
                      'xpack.enterpriseSearch.content.newConnector.newConnectorTemplate.nameInputPlaceholder',
                      {
                        defaultMessage: 'Set a name for your connector',
                      }
                    )}
                    fullWidth
                    disabled={disabled}
                    isInvalid={false}
                    value={rawName}
                    onChange={handleNameChange}
                    autoFocus
                  />
                </EuiFormRow>
                <EuiText size="xs" color="subdued">
                  {i18n.translate(
                    'xpack.enterpriseSearch.content.newConnector.newConnectorTemplate.nameInputHelpText.lineTwo',
                    {
                      defaultMessage:
                        'Names should be lowercase and cannot contain spaces or special characters.',
                    }
                  )}
                </EuiText>
              </EuiFlexItem>
            </EuiFlexGroup>
          </EuiFlexItem>
        </EuiFlexGroup>
        <EuiSpacer />
        <EuiFlexGroup direction="column" gutterSize="xs">
          {type === INGESTION_METHOD_IDS.CONNECTOR && (
            <EuiFlexItem grow={false}>
              <EuiLink
                data-test-subj="enterpriseSearchNewConnectorTemplateLearnMoreAboutConnectorsLink"
                target="_blank"
                href={docLinks.connectors}
              >
                {i18n.translate(
                  'xpack.enterpriseSearch.content.newConnector.newConnectorTemplate.learnMoreConnectors.linkText',
                  {
                    defaultMessage: 'Learn more about connectors',
                  }
                )}
              </EuiLink>
            </EuiFlexItem>
          )}
        </EuiFlexGroup>
        <EuiSpacer />
        <EuiFlexGroup direction="row" alignItems="center" justifyContent="spaceBetween">
          <EuiFlexItem grow={false}>
            <EuiButton
              data-test-subj="enterpriseSearchNewConnectorTemplateButton"
              data-telemetry-id={`entSearchContent-${type}-newConnector-goBack`}
              isDisabled={buttonLoading}
              onClick={() => history.back()}
            >
              {BACK_BUTTON_LABEL}
            </EuiButton>
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            <EuiButton
              data-test-subj={`entSearchContent-${type}-newConnector-createConnector`}
              data-telemetry-id={`entSearchContent-${type}-newConnector-createConnector`}
              fill
              isDisabled={!rawName || buttonLoading || formInvalid || disabled}
              isLoading={buttonLoading}
              type="submit"
            >
              {i18n.translate(
                'xpack.enterpriseSearch.content.newConnector.newConnectorTemplate.createIndex.buttonText',
                {
                  defaultMessage: 'Create connector',
                }
              )}
            </EuiButton>
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiForm>
    </>
  );
};
