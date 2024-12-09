/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { ChangeEvent } from 'react';

import { css } from '@emotion/react';
import { useValues, useActions } from 'kea';

import {
  EuiButton,
  EuiFieldText,
  EuiFlexGroup,
  EuiFlexItem,
  EuiForm,
  EuiFormRow,
  EuiLink,
  EuiSelect,
  EuiSpacer,
  EuiText,
  EuiTitle,
} from '@elastic/eui';

import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';

import { INGESTION_METHOD_IDS } from '../../../../../common/constants';

import { BetaConnectorCallout } from '../../../shared/beta/beta_connector_callout';

import { BACK_BUTTON_LABEL } from '../../../shared/constants';
import { docLinks } from '../../../shared/doc_links';

import { SUPPORTED_LANGUAGES } from './constants';
import { NewSearchIndexLogic } from './new_search_index_logic';
import { LanguageForOptimization } from './types';

export interface Props {
  buttonLoading?: boolean;
  disabled?: boolean;
  docsUrl?: string;
  error?: string | React.ReactNode;
  isBeta?: boolean;
  onNameChange?(name: string): void;
  onSubmit(name: string, language: LanguageForOptimization): void;
  type: string;
}

export const NewSearchIndexTemplate: React.FC<Props> = ({
  buttonLoading,
  disabled,
  error,
  onNameChange,
  onSubmit,
  type,
  isBeta,
}) => {
  const {
    fullIndexName,
    fullIndexNameExists,
    fullIndexNameIsValid,
    hasPrefix,
    language,
    rawName,
    languageSelectValue,
  } = useValues(NewSearchIndexLogic);
  const { setRawName, setLanguageSelectValue, setHasPrefix } = useActions(NewSearchIndexLogic);
  setHasPrefix(type === INGESTION_METHOD_IDS.CRAWLER);

  const handleNameChange = (e: ChangeEvent<HTMLInputElement>) => {
    setRawName(e.target.value);
    if (onNameChange) {
      onNameChange(fullIndexName);
    }
  };

  const handleLanguageChange = (e: ChangeEvent<HTMLSelectElement>) => {
    setLanguageSelectValue(e.target.value);
  };

  const formInvalid = !!error || fullIndexNameExists || !fullIndexNameIsValid;

  const formError = () => {
    if (fullIndexNameExists) {
      return i18n.translate(
        'xpack.enterpriseSearch.content.newIndex.newSearchIndexTemplate.alreadyExists.error',
        {
          defaultMessage: 'An index with the name {indexName} already exists',
          values: {
            indexName: fullIndexName,
          },
        }
      );
    }
    if (!fullIndexNameIsValid) {
      return i18n.translate(
        'xpack.enterpriseSearch.content.newIndex.newSearchIndexTemplate.isInvalid.error',
        {
          defaultMessage: '{indexName} is an invalid index name',
          values: {
            indexName: fullIndexName,
          },
        }
      );
    }
    return error;
  };
  const searchHelpTest = i18n.translate(
    'xpack.enterpriseSearch.content.newIndex.newSearchIndexTemplate.nameInputHelpText.lineOne',
    {
      defaultMessage: 'Your index will be named: {indexName}',
      values: {
        indexName: fullIndexName,
      },
    }
  );

  return (
    <>
      <EuiForm
        component="form"
        id="enterprise-search-create-index"
        onSubmit={(event) => {
          event.preventDefault();
          onSubmit(fullIndexName, language);
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
                  id="xpack.enterpriseSearch.content.newIndex.newSearchIndexTemplate.formTitle"
                  defaultMessage="Create an Elasticsearch index"
                />
              </h3>
            </EuiTitle>
          </EuiFlexItem>
          <EuiFlexItem>
            <EuiText size="m">
              <p>
                <FormattedMessage
                  id="xpack.enterpriseSearch.content.newIndex.newSearchIndexTemplate.formDescription"
                  defaultMessage="This index will hold your data source content, and is optimized with default field
                mappings for relevant search experiences. Give your index a unique name and
                optionally set a default {language_analyzer} for the index."
                  values={{
                    language_analyzer: (
                      <EuiLink target="_blank" href={docLinks.languageAnalyzers}>
                        {i18n.translate(
                          'xpack.enterpriseSearch.content.newIndex.newSearchIndexTemplate.formDescription.linkText',
                          {
                            defaultMessage: 'language analyzer',
                          }
                        )}
                      </EuiLink>
                    ),
                  }}
                />
              </p>
            </EuiText>
          </EuiFlexItem>
          <EuiFlexItem grow>
            <EuiFlexGroup>
              <EuiFlexItem grow>
                <EuiFormRow
                  isDisabled={disabled || buttonLoading}
                  label={i18n.translate(
                    'xpack.enterpriseSearch.content.newIndex.newSearchIndexTemplate.nameInputLabel',
                    {
                      defaultMessage: 'Index name',
                    }
                  )}
                  isInvalid={formInvalid}
                  error={
                    <EuiText
                      size="xs"
                      css={css`
                        line-break: anywhere;
                      `}
                    >
                      {formError()}
                    </EuiText>
                  }
                  helpText={
                    <EuiText
                      size="xs"
                      css={css`
                        line-break: anywhere;
                      `}
                    >
                      {searchHelpTest}
                    </EuiText>
                  }
                  fullWidth
                >
                  <EuiFieldText
                    data-test-subj={`entSearchContent-${type}-newIndex-editName`}
                    data-telemetry-id={`entSearchContent-${type}-newIndex-editName`}
                    placeholder={i18n.translate(
                      'xpack.enterpriseSearch.content.newIndex.newSearchIndexTemplate.nameInputPlaceholder',
                      {
                        defaultMessage: 'Set a name for your index',
                      }
                    )}
                    fullWidth
                    disabled={disabled}
                    isInvalid={false}
                    value={rawName}
                    onChange={handleNameChange}
                    autoFocus
                    prepend={hasPrefix ? 'search-' : undefined}
                  />
                </EuiFormRow>
                <EuiText size="xs" color="subdued">
                  {i18n.translate(
                    'xpack.enterpriseSearch.content.newIndex.newSearchIndexTemplate.nameInputHelpText.lineTwo',
                    {
                      defaultMessage:
                        'Names should be lowercase and cannot contain spaces or special characters.',
                    }
                  )}
                </EuiText>
              </EuiFlexItem>
              <EuiFlexItem grow={false}>
                <EuiFormRow
                  isDisabled={disabled}
                  label={i18n.translate(
                    'xpack.enterpriseSearch.content.newIndex.newSearchIndexTemplate.languageInputLabel',
                    {
                      defaultMessage: 'Language analyzer',
                    }
                  )}
                  helpText={i18n.translate(
                    'xpack.enterpriseSearch.content.newIndex.newSearchIndexTemplate.languageInputHelpText',
                    {
                      defaultMessage: 'Language can be changed later, but may require a reindex',
                    }
                  )}
                >
                  <EuiSelect
                    data-telemetry-id={`entSearchContent-${type}-newIndex-languageAnalyzer`}
                    disabled={disabled}
                    options={SUPPORTED_LANGUAGES}
                    onChange={handleLanguageChange}
                    value={languageSelectValue}
                  />
                </EuiFormRow>
              </EuiFlexItem>
            </EuiFlexGroup>
          </EuiFlexItem>
        </EuiFlexGroup>
        <EuiSpacer />
        <EuiFlexGroup direction="column" gutterSize="xs">
          <EuiFlexItem>
            <EuiLink target="_blank" href={docLinks.elasticsearchGettingStarted}>
              {i18n.translate(
                'xpack.enterpriseSearch.content.newIndex.newSearchIndexTemplate.learnMoreIndices.linkText',
                {
                  defaultMessage: 'Learn more about indices',
                }
              )}
            </EuiLink>
          </EuiFlexItem>

          {type === INGESTION_METHOD_IDS.CONNECTOR && (
            <EuiFlexItem grow={false}>
              <EuiLink target="_blank" href={docLinks.connectors}>
                {i18n.translate(
                  'xpack.enterpriseSearch.content.newIndex.newSearchIndexTemplate.learnMoreConnectors.linkText',
                  {
                    defaultMessage: 'Learn more about connectors',
                  }
                )}
              </EuiLink>
            </EuiFlexItem>
          )}
          {type === INGESTION_METHOD_IDS.CRAWLER && (
            <EuiFlexItem grow={false}>
              <EuiLink target="_blank" href={docLinks.crawlerOverview}>
                {i18n.translate(
                  'xpack.enterpriseSearch.content.newIndex.newSearchIndexTemplate.learnMoreCrawler.linkText',
                  {
                    defaultMessage: 'Learn more about the Elastic Web Crawler',
                  }
                )}
              </EuiLink>
            </EuiFlexItem>
          )}
          {type === INGESTION_METHOD_IDS.API && (
            <EuiFlexItem grow={false}>
              <EuiLink target="_blank" href={docLinks.ingestionApis}>
                {i18n.translate(
                  'xpack.enterpriseSearch.content.newIndex.newSearchIndexTemplate.learnMoreApis.linkText',
                  {
                    defaultMessage: 'Learn more about ingestion APIs',
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
              data-telemetry-id={`entSearchContent-${type}-newIndex-goBack`}
              isDisabled={buttonLoading}
              onClick={() => history.back()}
            >
              {BACK_BUTTON_LABEL}
            </EuiButton>
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            <EuiButton
              data-test-subj={`entSearchContent-${type}-newIndex-createIndex`}
              data-telemetry-id={`entSearchContent-${type}-newIndex-createIndex`}
              fill
              isDisabled={!rawName || buttonLoading || formInvalid || disabled}
              isLoading={buttonLoading}
              type="submit"
            >
              {i18n.translate(
                'xpack.enterpriseSearch.content.newIndex.newSearchIndexTemplate.createIndex.buttonText',
                {
                  defaultMessage: 'Create index',
                }
              )}
            </EuiButton>
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiForm>
    </>
  );
};
