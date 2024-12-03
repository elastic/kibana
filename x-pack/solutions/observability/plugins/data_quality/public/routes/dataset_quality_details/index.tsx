/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiEmptyPrompt, EuiLoadingLogo } from '@elastic/eui';
import type { DatasetQualityDetailsController } from '@kbn/dataset-quality-plugin/public/controller/dataset_quality_details';
import { FormattedMessage } from '@kbn/i18n-react';
import { useKbnUrlStateStorageFromRouterContext } from '../../utils/kbn_url_state_context';
import { useKibanaContextForPlugin } from '../../utils/use_kibana';
import { DatasetQualityDetailsContextProvider, useDatasetQualityDetailsContext } from './context';

export const DatasetQualityDetailsRoute = () => {
  const urlStateStorageContainer = useKbnUrlStateStorageFromRouterContext();
  const {
    services: { datasetQuality, notifications },
  } = useKibanaContextForPlugin();

  return (
    <DatasetQualityDetailsContextProvider
      datasetQuality={datasetQuality}
      urlStateStorageContainer={urlStateStorageContainer}
      toastsService={notifications.toasts}
    >
      <ConnectedContent />
    </DatasetQualityDetailsContextProvider>
  );
};

const ConnectedContent = React.memo(() => {
  const { controller } = useDatasetQualityDetailsContext();

  return controller ? (
    <InitializedContent datasetQualityDetailsController={controller} />
  ) : (
    <>
      <EuiEmptyPrompt
        icon={<EuiLoadingLogo logo="logoKibana" size="xl" />}
        title={
          <FormattedMessage
            id="xpack.dataQuality.details.Initializing"
            defaultMessage="Initializing Data set quality details page"
          />
        }
      />
    </>
  );
});

const InitializedContent = React.memo(
  ({
    datasetQualityDetailsController,
  }: {
    datasetQualityDetailsController: DatasetQualityDetailsController;
  }) => {
    const {
      services: { datasetQuality },
    } = useKibanaContextForPlugin();

    return <datasetQuality.DatasetQualityDetails controller={datasetQualityDetailsController} />;
  }
);
