/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback } from 'react';
import { EuiCard, EuiButtonEmpty, EuiFlexGroup, EuiPanel } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';

import { useKibana } from '../hooks/use_kibana';
import { SampleDataActionButton } from './sample_data_action_button';
import { useIsSampleDataAvailable } from '../hooks/use_sample_data_is_available';

export const ConnectToElasticsearchSidePanel = () => {
  const { application } = useKibana().services;

  const onFileUpload = useCallback(() => {
    application.navigateToApp('ml', { path: 'filedatavisualizer' });
  }, [application]);
  const {
    hasRequiredLicense,
    isPluginAvailable: isSampleDataIngestPluginAvailable,
    hasPrivileges: hasSampleDataRequiredPrivileges,
  } = useIsSampleDataAvailable();

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

        {isSampleDataIngestPluginAvailable && hasSampleDataRequiredPrivileges && (
          <EuiCard
            display="plain"
            hasBorder
            textAlign="left"
            titleSize="xs"
            data-test-subj="sampleDataSection"
            betaBadgeProps={
              hasRequiredLicense
                ? undefined
                : {
                    label: i18n.translate(
                      'xpack.searchHomepage.connectToElasticsearch.licenseBadge.title',
                      {
                        defaultMessage: 'Enterprise',
                      }
                    ),
                    tooltipContent: i18n.translate(
                      'xpack.searchHomepage.connectToElasticsearch.licenseBadge.description',
                      {
                        defaultMessage:
                          'This dataset makes use of AI features that require an Enterprise license.',
                      }
                    ),
                  }
            }
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
            footer={<SampleDataActionButton hasRequiredLicense={hasRequiredLicense} />}
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
