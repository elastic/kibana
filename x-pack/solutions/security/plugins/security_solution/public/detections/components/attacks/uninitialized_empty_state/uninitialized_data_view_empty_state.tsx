/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiEmptyPrompt, EuiCode } from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n-react';
import type { DataView } from '@kbn/data-views-plugin/public';
import * as i18n from './translations';

export const UNINITIALIZED_DATA_VIEW_EMPTY_STATE_TEST_ID = 'uninitialized-data-view-empty-state';

export interface UninitializedDataViewEmptyStateProps {
  /** DataView instance */
  dataView: DataView;
}

/**
 * Empty state component for when a data view is not initialized.
 * Shows a message to the user to make sure that the data view has matching indices.
 */
export const UninitializedDataViewEmptyState = React.memo(
  ({ dataView }: UninitializedDataViewEmptyStateProps) => {
    const dataViewName = dataView.getName();
    const dataViewPattern = dataView.getIndexPattern();

    return (
      <EuiEmptyPrompt
        data-test-subj={UNINITIALIZED_DATA_VIEW_EMPTY_STATE_TEST_ID}
        iconType="search"
        title={<h2>{i18n.UNINITIALIZED_DATA_VIEW_TITLE}</h2>}
        body={
          <p>
            <FormattedMessage
              id="xpack.securitySolution.detections.emptyStates.uninitializedDataViewBody"
              defaultMessage="Make sure that the data view {dataViewName} with index pattern {dataViewPattern} has matching indices. Indices will be created automatically when the first alert or attack is written."
              values={{
                dataViewName: <strong>{dataViewName}</strong>,
                dataViewPattern: <EuiCode>{dataViewPattern}</EuiCode>,
              }}
            />
          </p>
        }
      />
    );
  }
);
UninitializedDataViewEmptyState.displayName = 'UninitializedDataViewEmptyState';
