/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React, { useCallback, useMemo } from 'react';
import { EuiCard, EuiButtonEmpty, EuiFlexGroup, EuiPanel } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';
import { SampleDataActionButton } from './sample_data_action_button';
import { useIngestSampleData } from '../hooks/use_ingest_data';
import { useKibana } from '../hooks/use_kibana';
import { useUserPrivilegesQuery } from '../hooks/api/use_user_permissions';
import { generateRandomIndexName } from '../utils/indices';

export const ConnectToElasticsearchSidePanel = () => {
  const { application, sampleDataIngest } = useKibana().services;

  const { ingestSampleData, isLoading } = useIngestSampleData();

  const onFileUpload = useCallback(() => {
    application.navigateToApp('ml', { path: 'filedatavisualizer' });
  }, [application]);

  const indexName = useMemo(() => generateRandomIndexName(), []);
  const { data: userPrivileges } = useUserPrivilegesQuery(indexName);

  return (
    <EuiPanel color="subdued" grow={false}>
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
              onClick={onFileUpload}
              iconType="importAction"
              data-test-subj="uploadFileButton"
            >
              {i18n.translate('xpack.searchHomepage.connectToElasticsearch.uploadFileButton', {
                defaultMessage: 'Upload a file',
              })}
            </EuiButtonEmpty>
          }
        />

        {sampleDataIngest && userPrivileges?.privileges?.canManageIndex === true && (
          <EuiCard
            display="plain"
            hasBorder
            textAlign="left"
            titleSize="xs"
            data-test-subj="sampleDataSection"
            title={
              <FormattedMessage
                id="xpack.searchHomepage.connectToElasticsearch.sampleDatasetTitle"
                defaultMessage="Add sample data"
              />
            }
            description={
              <FormattedMessage
                id="xpack.searchHomepage.connectToElasticsearch.uploadFileDescription"
                defaultMessage="Add data sets with sample visualizations, dashboards, and more."
              />
            }
            footer={
              <SampleDataActionButton isLoading={isLoading} onIngestSampleData={ingestSampleData} />
            }
          />
        )}

        {/* TODO: Enable CE block once we can discern the billing type.
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
              defaultMessage="Get in touch with us for help getting started with best practices on data ingest, performance, and/or cost efficiency in your Serverless projects!"
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
                  defaultMessage: 'Submit a request',
                }
              )}
            </EuiLink>
          }
        /> */}
      </EuiFlexGroup>
    </EuiPanel>
  );
};
