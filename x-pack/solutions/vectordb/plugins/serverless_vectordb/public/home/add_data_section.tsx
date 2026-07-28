/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback } from 'react';
import { EuiListGroup, EuiListGroupItem, EuiSpacer, EuiText, EuiTitle } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { useKibana } from '../hooks/use_kibana';

export const AddDataSection = () => {
  const {
    services: { application, share },
  } = useKibana();

  const navigateToIndexManagement = useCallback(async () => {
    const locator = share.url.locators.get('SEARCH_INDEX_MANAGEMENT_LOCATOR_ID');
    if (locator) await locator.navigate({ page: 'index_list' });
  }, [share]);

  return (
    <>
      <EuiTitle size="s">
        <h3>
          {i18n.translate('xpack.serverlessVectordb.home.addData.title', {
            defaultMessage: 'Add data',
          })}
        </h3>
      </EuiTitle>
      <EuiSpacer size="xs" />
      <EuiText size="s" color="subdued">
        <p>
          {i18n.translate('xpack.serverlessVectordb.home.addData.description', {
            defaultMessage: 'Explore various options to add data effortlessly.',
          })}
        </p>
      </EuiText>
      <EuiSpacer size="m" />
      <EuiListGroup bordered>
        <EuiListGroupItem
          iconType="documentation"
          label={i18n.translate('xpack.serverlessVectordb.home.addData.embeddings', {
            defaultMessage: 'Learn how to generate or store embeddings',
          })}
          onClick={() => application.navigateToApp('vectordb', { path: '/tutorials' })}
          data-test-subj="addDataEmbeddingsLink"
          data-telemetry-id="serverlessVectordb-home-addData-embeddings"
        />
        <EuiListGroupItem
          iconType="indexOpen"
          label={i18n.translate('xpack.serverlessVectordb.home.addData.createIndex', {
            defaultMessage: 'Create a blank index',
          })}
          onClick={navigateToIndexManagement}
          data-test-subj="addDataCreateIndexLink"
          data-telemetry-id="serverlessVectordb-home-addData-createIndex"
        />
        <EuiListGroupItem
          iconType="folderOpen"
          label={i18n.translate('xpack.serverlessVectordb.home.addData.sampleData', {
            defaultMessage: 'Sample data',
          })}
          onClick={() =>
            application.navigateToApp('home', { path: '#/tutorial_directory/sampleData' })
          }
          data-test-subj="addDataSampleDataLink"
          data-telemetry-id="serverlessVectordb-home-addData-sampleData"
        />
        <EuiListGroupItem
          iconType="exportAction"
          label={i18n.translate('xpack.serverlessVectordb.home.addData.uploadFile', {
            defaultMessage: 'Upload a file',
          })}
          onClick={() =>
            application.navigateToApp('home', { path: '#/tutorial_directory/fileDataViz' })
          }
          data-test-subj="addDataUploadFileLink"
          data-telemetry-id="serverlessVectordb-home-addData-uploadFile"
        />
      </EuiListGroup>
    </>
  );
};
