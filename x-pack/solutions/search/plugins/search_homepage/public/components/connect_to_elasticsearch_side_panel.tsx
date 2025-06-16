/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React from 'react';
import {
  EuiSplitPanel,
  EuiCard,
  EuiButtonEmpty,
  EuiFlexGroup,
  EuiFlexItem,
  EuiTitle,
  EuiText,
  EuiLink,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';
import { useKibana } from '../hooks/use_kibana';
import { docLinks } from '../../common/doc_links';

const UPLOAD_FILE_URL = '/app/home#/tutorial_directory/fileDataViz';

export const ConnectToElasticsearchSidePanel = () => {
  const { http } = useKibana().services;

  return (
    <EuiSplitPanel.Outer hasShadow={false} color="subdued">
      <EuiSplitPanel.Inner>
        <EuiCard
          textAlign="left"
          titleSize="xs"
          title={i18n.translate('xpack.searchHomepage.connectToElasticsearch.uploadFileTitle', {
            defaultMessage: 'Upload a file',
          })}
          description={
            <FormattedMessage
              id="xpack.searchHomepage.connectToElasticsearch.uploadFileDescription"
              defaultMessage="Upload your file, analyze its data, and import the data into an Elasticsearch index."
            />
          }
          footer={
            <EuiButtonEmpty
              href={http.basePath.prepend(UPLOAD_FILE_URL)}
              iconType="importAction"
              data-test-subj="uploadFileButton"
            >
              {i18n.translate('xpack.searchHomepage.connectToElasticsearch.uploadFileButton', {
                defaultMessage: 'Upload a file',
              })}
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
            <EuiButtonEmpty href="#" iconType="importAction" data-test-subj="sampleDatasetButton">
              {i18n.translate('xpack.searchHomepage.connectToElasticsearch.sampleDatasetButton', {
                defaultMessage: 'Sample dataset',
              })}
            </EuiButtonEmpty>
          }
        />
      </EuiSplitPanel.Inner>
      <EuiSplitPanel.Inner>
        <EuiFlexGroup direction="column" gutterSize="s">
          <EuiFlexItem grow={false}>
            <EuiTitle size="xs">
              <span>
                {i18n.translate('xpack.searchHomepage.connectToElasticsearch.needAdviceTitle', {
                  defaultMessage: 'Need advice? Engage a Customer Engineer.',
                })}
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
            <EuiLink
              href={docLinks.customerEngineerRequestForm}
              data-test-subj="customerEngineerRequestFormLink"
            >
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
  );
};
