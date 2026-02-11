/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiFlexGroup, EuiFlexItem, EuiText } from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n-react';
import { SampleDataActionButton } from './sample_data_action_button';

interface SampleDataPanelProps {
  isLoading: boolean;
  onIngestSampleData: () => void;
  hasRequiredLicense?: boolean;
}

export const SampleDataPanel = ({
  isLoading,
  onIngestSampleData,
  hasRequiredLicense = false,
}: SampleDataPanelProps) => {
  return (
    <EuiFlexGroup gutterSize="xs" alignItems="center">
      <EuiFlexItem grow={false}>
        <EuiText color="subdued" size="s">
          <p>
            <FormattedMessage
              id="xpack.searchIndices.shared.createIndex.sampleData.text"
              defaultMessage="Want to try sample data?"
            />
          </p>
        </EuiText>
      </EuiFlexItem>
      <EuiFlexItem grow={false}>
        <SampleDataActionButton
          isLoading={isLoading}
          onIngestSampleData={onIngestSampleData}
          hasRequiredLicense={hasRequiredLicense}
        />
      </EuiFlexItem>
    </EuiFlexGroup>
  );
};
