/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiCard } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';
import { SampleDataActionButton } from './sample_data_action_button';
import { useIsSampleDataAvailable } from '../hooks/use_is_sample_data_available';

export const SampleDataIngestPanel = () => {
  const {
    hasRequiredLicense,
    isPluginAvailable: isSampleDataIngestPluginAvailable,
    hasPrivileges: hasSampleDataRequiredPrivileges,
  } = useIsSampleDataAvailable();

  return (
    isSampleDataIngestPluginAvailable &&
    hasSampleDataRequiredPrivileges && (
      <EuiCard
        display="plain"
        hasBorder
        textAlign="left"
        titleSize="xs"
        data-test-subj="sampleDataSection"
        betaBadgeProps={{
          label: i18n.translate('xpack.searchHomepage.connectToElasticsearch.licenseBadge.title', {
            defaultMessage: 'Enterprise',
          }),
          'data-test-subj': 'licenceRequiredBadge',
          tooltipContent: i18n.translate(
            'xpack.searchHomepage.connectToElasticsearch.licenseBadge.description',
            {
              defaultMessage:
                'This dataset makes use of AI features that require an Enterprise license.',
            }
          ),
        }}
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
          <SampleDataActionButton
            data-test-subj="sampleDataActionButton"
            hasRequiredLicense={hasRequiredLicense}
          />
        }
      />
    )
  );
};
