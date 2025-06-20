/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React from 'react';
import { EuiCard, EuiButtonEmpty, EuiFlexGroup, EuiLink, EuiPanel } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';
import { useKibana } from '../hooks/use_kibana';
import { docLinks } from '../../common/doc_links';

const UPLOAD_FILE_URL = '/app/home#/tutorial_directory/fileDataViz';

export const ConnectToElasticsearchSidePanel = () => {
  const { http } = useKibana().services;

  return (
    <EuiPanel color="subdued">
      <EuiFlexGroup gutterSize="m" direction="column">
        <EuiCard
          display="plain"
          hasBorder
          textAlign="left"
          titleSize="xs"
          title={i18n.translate('xpack.searchHomepage.connectToElasticsearch.uploadFileTitle', {
            defaultMessage: 'Upload a file',
          })}
          description={
            <FormattedMessage
              id="xpack.searchHomepage.connectToElasticsearch.uploadFileDescription"
              defaultMessage="Analyze and import data from a file."
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
        <EuiCard
          display="plain"
          hasBorder
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
              defaultMessage="Add data sets with sample visualizations, dashboards, and more." 
            />
          }
          footer={
            <EuiButtonEmpty href="#" iconType="importAction" data-test-subj="sampleDatasetButton">
              {i18n.translate('xpack.searchHomepage.connectToElasticsearch.sampleDatasetButton', {
                defaultMessage: 'Add sample data',
              })}
            </EuiButtonEmpty>
          }
        />
        <EuiCard
          display="transparent"
          textAlign="left"
          titleSize="xs"
          title={
            <FormattedMessage
              id="xpack.searchHomepage.connectToElasticsearch.needAdviceTitle"
              defaultMessage="Need help with Serverless? Engage a customer engineer."
            />
          }
          description={
            <FormattedMessage
              id="xpack.searchHomepage.connectToElasticsearch.getExpertAdviceDescription"
              defaultMessage="Get in touch with us for help getting started with best practices on data ingest, per
formance, and/or cost efficiency in your Serverless projects!"
            />
          }
          footer={
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
          }
        />
      </EuiFlexGroup>
    </EuiPanel>
  );
};
