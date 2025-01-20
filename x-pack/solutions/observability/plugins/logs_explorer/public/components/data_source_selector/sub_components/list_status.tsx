/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiButton, EuiEmptyPrompt, EuiText, EuiToolTip } from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n-react';
import { DataViewDescriptor } from '../../../../common/data_views/models/data_view_descriptor';
import { ReloadDatasets } from '../../../hooks/use_datasets';
import { errorLabel, noDataRetryLabel } from '../constants';
import type { Dataset, Integration } from '../../../../common/datasets';
import { DatasetSkeleton } from './datasets_skeleton';

export interface ListStatusProps {
  data: Dataset[] | Integration[] | DataViewDescriptor[] | null;
  description: string;
  error: Error | null;
  isLoading: boolean;
  onRetry: ReloadDatasets;
  title: string;
}

export const ListStatus = ({
  data,
  description,
  error,
  isLoading,
  onRetry,
  title,
}: ListStatusProps) => {
  const isEmpty = data == null || data.length <= 0;
  const hasError = error !== null;

  if (isLoading) {
    return <DatasetSkeleton />;
  }

  if (hasError) {
    return (
      <EuiEmptyPrompt
        data-test-subj="dataSourceSelectorListStatusErrorPrompt"
        iconType="warning"
        iconColor="danger"
        paddingSize="m"
        title={<h2>{title}</h2>}
        titleSize="s"
        body={
          <FormattedMessage
            id="xpack.logsExplorer.dataSourceSelector.noDataError"
            defaultMessage="An {error} occurred while getting your data. Please retry."
            values={{
              error: (
                <EuiToolTip content={error.message}>
                  <EuiText color="danger">{errorLabel}</EuiText>
                </EuiToolTip>
              ),
            }}
          />
        }
        actions={[
          <EuiButton data-test-subj="logsExplorerListStatusButton" onClick={onRetry}>
            {noDataRetryLabel}
          </EuiButton>,
        ]}
      />
    );
  }

  if (isEmpty) {
    return (
      <EuiEmptyPrompt
        data-test-subj="dataSourceSelectorListStatusEmptyPrompt"
        iconType="search"
        paddingSize="m"
        title={<h2>{title}</h2>}
        titleSize="s"
        body={<p>{description}</p>}
      />
    );
  }

  return null;
};

// eslint-disable-next-line import/no-default-export
export default ListStatus;
