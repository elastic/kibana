/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useEffect } from 'react';

import { useActions, useValues } from 'kea';

import type { EuiBasicTableColumn } from '@elastic/eui';
import { EuiBasicTable, EuiSpacer, EuiLoadingSpinner } from '@elastic/eui';

import { i18n } from '@kbn/i18n';

import type { MlInferenceHistoryItem } from '../../../../../../common/types/pipelines';
import { DataPanel } from '../../../../shared/data_panel/data_panel';

import { InferenceHistoryLogic } from './inference_history_logic';

export const InferenceHistory: React.FC = () => {
  const { indexName, isLoading, inferenceHistory } = useValues(InferenceHistoryLogic);
  const { fetchIndexInferenceHistory } = useActions(InferenceHistoryLogic);

  useEffect(() => {
    fetchIndexInferenceHistory({ indexName });
  }, [indexName]);

  const historyTitle = i18n.translate(
    'xpack.enterpriseSearch.content.indices.pipelines.tabs.inferenceHistory.title',
    { defaultMessage: 'Historical inference processors' }
  );

  const historyColumns: Array<EuiBasicTableColumn<MlInferenceHistoryItem>> = [
    {
      dataType: 'string',
      field: 'pipeline',
      name: i18n.translate(
        'xpack.enterpriseSearch.content.indices.pipelines.tabs.inferenceHistory.tableColumn.pipeline',
        { defaultMessage: 'Inference pipeline' }
      ),
    },
    {
      dataType: 'number',
      field: 'doc_count',
      name: i18n.translate(
        'xpack.enterpriseSearch.content.indices.pipelines.tabs.inferenceHistory.tableColumn.docCount',
        { defaultMessage: 'Approx. document count' }
      ),
    },
  ];
  return (
    <>
      <EuiSpacer />
      <DataPanel
        hasBorder
        iconType="compute"
        title={<h3>{historyTitle}</h3>}
        subtitle={i18n.translate(
          'xpack.enterpriseSearch.content.indices.pipelines.tabs.inferenceHistory.subtitle',
          {
            defaultMessage:
              'The following inference processors were found in the _ingest.processors field of documents on this index.',
          }
        )}
      >
        {isLoading ? (
          <EuiLoadingSpinner />
        ) : (
          <EuiBasicTable
            columns={historyColumns}
            items={inferenceHistory ?? []}
            rowHeader="pipeline"
            tableCaption={historyTitle}
            noItemsMessage={i18n.translate(
              'xpack.enterpriseSearch.content.indices.pipelines.tabs.inferenceHistory.emptyMessage',
              { defaultMessage: 'This index has no inference history' }
            )}
          />
        )}
      </DataPanel>
    </>
  );
};
