/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React from 'react';
import {
  EuiTitle,
  EuiText,
  EuiHorizontalRule,
  EuiFlexGroup,
  EuiFlexItem,
  EuiFieldText,
  EuiCopy,
  EuiButtonIcon,
  EuiButton,
  EuiButtonEmpty,
  EuiBadge,
  EuiSplitPanel,
  EuiCard,
  EuiLink,
} from '@elastic/eui';

import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';

const LOCALHOST_URL = 'http://localhost:9200/';

export const ConnectToElasticsearch = () => {
  return (
    <>
      <EuiFlexGroup>
        <EuiFlexItem>
          <EuiFlexGroup direction="column" gutterSize="l">
            <EuiFlexItem grow={false}>
              <EuiFlexGroup direction="column" gutterSize="s">
                <EuiFlexItem grow={false}>
                  <EuiTitle size="m">
                    <span>
                      {i18n.translate('xpack.searchHomepage.connectToElasticsearch.title', {
                        defaultMessage: 'Connect to Elasticsearch',
                      })}
                    </span>
                  </EuiTitle>
                </EuiFlexItem>
                <EuiFlexItem grow={false}>
                  <EuiText>
                    {i18n.translate('xpack.searchHomepage.connectToElasticsearch.description', {
                      defaultMessage:
                        'Set up your connection to Elasticsearch to start searching and analyzing your data.',
                    })}
                  </EuiText>
                </EuiFlexItem>
              </EuiFlexGroup>
            </EuiFlexItem>
            <EuiFlexItem>
              <EuiFlexGroup alignItems="flexStart" gutterSize="l">
                <EuiFlexItem grow={false}>
                  <EuiFlexGroup direction="column" gutterSize="s">
                    <EuiFlexItem grow={false}>
                      <EuiTitle size="xxs">
                        <span>
                          {i18n.translate(
                            'xpack.searchHomepage.connectToElasticsearch.elasticSearchEndpointLabel',
                            {
                              defaultMessage: 'Elasticsearch endpoint',
                            }
                          )}
                        </span>
                      </EuiTitle>
                    </EuiFlexItem>
                    <EuiFlexItem grow={false}>
                      <EuiFlexGroup gutterSize="s">
                        <EuiFlexItem grow={false}>
                          <EuiCopy textToCopy={LOCALHOST_URL}>
                            {(copy) => (
                              <EuiButtonIcon onClick={copy} iconType="copyClipboard" size="m" />
                            )}
                          </EuiCopy>
                        </EuiFlexItem>
                        <EuiFlexItem grow={false}>
                          <EuiFieldText value={LOCALHOST_URL} readOnly style={{ width: 400 }} />
                        </EuiFlexItem>
                      </EuiFlexGroup>
                    </EuiFlexItem>
                  </EuiFlexGroup>
                </EuiFlexItem>
                <EuiFlexItem grow={false}>
                  <EuiFlexGroup direction="column" gutterSize="s">
                    <EuiFlexItem grow={false}>
                      <EuiTitle size="xxs">
                        <span>
                          {i18n.translate(
                            'xpack.searchHomepage.connectToElasticsearch.apiKeysLabel',
                            {
                              defaultMessage: 'API Keys',
                            }
                          )}
                        </span>
                      </EuiTitle>
                    </EuiFlexItem>
                    <EuiFlexItem grow={false}>
                      <EuiFlexGroup gutterSize="s" alignItems="baseline">
                        <EuiFlexItem grow={false}>
                          <EuiButton iconType="key">
                            {i18n.translate(
                              'xpack.searchHomepage.connectToElasticsearch.createApiKey',
                              {
                                defaultMessage: 'Create API Key',
                              }
                            )}
                          </EuiButton>
                        </EuiFlexItem>
                        <EuiFlexItem grow={false}>
                          <EuiButtonEmpty iconType="gear">Manage API keys</EuiButtonEmpty>
                        </EuiFlexItem>
                        <EuiFlexItem grow={false}>
                          <EuiBadge>0 active</EuiBadge>
                        </EuiFlexItem>
                      </EuiFlexGroup>
                    </EuiFlexItem>
                  </EuiFlexGroup>
                </EuiFlexItem>
              </EuiFlexGroup>
            </EuiFlexItem>
          </EuiFlexGroup>
        </EuiFlexItem>
        <EuiFlexItem grow={false} style={{ maxWidth: 430 }}>
          <EuiSplitPanel.Outer>
            <EuiSplitPanel.Inner>
              <EuiCard
                textAlign="left"
                titleSize="xs"
                title={
                  <FormattedMessage
                    id="xpack.searchHomepage.connectToElasticsearch.uploadFileTitle"
                    defaultMessage="Upload a file"
                  />
                }
                description={
                  <FormattedMessage
                    id="xpack.searchHomepage.connectToElasticsearch.uploadFileDescription"
                    defaultMessage="Upload your file, analyze its data, and import the data into an Elasticsearch index."
                  />
                }
                footer={
                  <EuiButtonEmpty flush="right" iconType="importAction">
                    <FormattedMessage
                      id="xpack.searchHomepage.connectToElasticsearch.uploadFileButton"
                      defaultMessage="Upload a file"
                    />
                  </EuiButtonEmpty>
                }
              />
            </EuiSplitPanel.Inner>
            <EuiSplitPanel.Inner>
              <EuiCard
                textAlign="left"
                titleSize="xs"
                title={
                  <FormattedMessage
                    id="xpack.searchHomepage.connectToElasticsearch.sampleDatasetTitle"
                    defaultMessage="Sample dataset"
                  />
                }
                description={
                  <FormattedMessage
                    id="xpack.searchHomepage.connectToElasticsearch.uploadFileDescription"
                    defaultMessage="Upload your file, analyze its data, and import the data into an Elasticsearch index."
                  />
                }
                footer={
                  <EuiButtonEmpty flush="right" iconType="importAction">
                    <FormattedMessage
                      id="xpack.searchHomepage.connectToElasticsearch.sampleDatasetButton"
                      defaultMessage="Sample dataset"
                    />
                  </EuiButtonEmpty>
                }
              />
            </EuiSplitPanel.Inner>
            <EuiSplitPanel.Inner>
              <EuiFlexGroup direction="column" gutterSize="s">
                <EuiFlexItem grow={false}>
                  <EuiTitle size="xs">
                    <span>
                      {i18n.translate(
                        'xpack.searchHomepage.connectToElasticsearch.needAdviceTitle',
                        {
                          defaultMessage: 'Need advice? Engage a Customer Engineer.',
                        }
                      )}
                    </span>
                  </EuiTitle>
                </EuiFlexItem>
                <EuiFlexItem grow={false}>
                  <EuiText size="s" color="subdued">
                    {i18n.translate(
                      'xpack.searchHomepage.connectToElasticsearch.getExpertAdviceDescription',
                      {
                        defaultMessage:
                          'Get expert advice on best practices, performance, upgrade paths and efficiency. ',
                      }
                    )}
                  </EuiText>
                </EuiFlexItem>
                <EuiFlexItem grow={false}>
                  <EuiLink href="https://www.elastic.co/contact/support" target="_blank">
                    {i18n.translate(
                      'xpack.searchHomepage.connectToElasticsearch.customerEngineerRequestForm',
                      {
                        defaultMessage: 'Customer Engineer Request Form',
                      }
                    )}
                  </EuiLink>
                </EuiFlexItem>
              </EuiFlexGroup>
            </EuiSplitPanel.Inner>
          </EuiSplitPanel.Outer>
        </EuiFlexItem>
      </EuiFlexGroup>
      <EuiHorizontalRule />
    </>
  );
};
