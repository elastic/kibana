/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback } from 'react';
import { css } from '@emotion/react';
import { EuiListGroup, EuiListGroupItem, EuiSpacer, EuiText, EuiTitle, useEuiTheme } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { useKibana } from '../hooks/use_kibana';

export const AddDataSection = () => {
  const {
    services: { application, share },
  } = useKibana();
  const { euiTheme } = useEuiTheme();

  const navigateToIndexManagement = useCallback(async () => {
    const locator = share.url.locators.get('SEARCH_INDEX_MANAGEMENT_LOCATOR_ID');
    if (locator) await locator.navigate({ page: 'index_list' });
  }, [share]);

  const addDataLinks = [
    {
      key: 'embeddings',
      iconType: 'rocket',
      label: i18n.translate('xpack.serverlessVectordb.home.addData.embeddings', {
        defaultMessage: 'Generate or store embeddings',
      }),
      onClick: () => application.navigateToApp('vectordb', { path: '/getting-started' }),
      testSubj: 'addDataEmbeddingsLink',
      telemetryId: 'serverlessVectordb-home-addData-embeddings',
    },
    {
      key: 'createIndex',
      iconType: 'indexOpen',
      label: i18n.translate('xpack.serverlessVectordb.home.addData.createIndex', {
        defaultMessage: 'Create a blank index',
      }),
      onClick: navigateToIndexManagement,
      testSubj: 'addDataCreateIndexLink',
      telemetryId: 'serverlessVectordb-home-addData-createIndex',
    },
    {
      key: 'sampleData',
      iconType: 'unarchive',
      label: i18n.translate('xpack.serverlessVectordb.home.addData.sampleData', {
        defaultMessage: 'Sample data',
      }),
      onClick: () =>
        application.navigateToApp('home', { path: '#/tutorial_directory/sampleData' }),
      testSubj: 'addDataSampleDataLink',
      telemetryId: 'serverlessVectordb-home-addData-sampleData',
    },
    {
      key: 'uploadFile',
      iconType: 'upload',
      label: i18n.translate('xpack.serverlessVectordb.home.addData.uploadFile', {
        defaultMessage: 'Upload a file',
      }),
      onClick: () =>
        application.navigateToApp('home', { path: '#/tutorial_directory/fileDataViz' }),
      testSubj: 'addDataUploadFileLink',
      telemetryId: 'serverlessVectordb-home-addData-uploadFile',
    },
  ];

  return (
    <>
      <EuiTitle size="xs">
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
      <EuiListGroup bordered={false} css={{ gap: euiTheme.size.xs }} maxWidth={false}>
        {addDataLinks.map(({ key, iconType, label, onClick, testSubj, telemetryId }) => (
          <EuiListGroupItem
            css={css`
              padding-top: ${euiTheme.size.s};
              padding-bottom: ${euiTheme.size.s};
              padding-left: ${euiTheme.size.m};
              border: ${euiTheme.border.thin};

              &:hover {
                border-color: ${euiTheme.colors.primary};
                background-color: ${euiTheme.colors.backgroundBasePlain};
                color: ${euiTheme.colors.textPrimary};
              }
            `}
            color="text"
            key={key}
            iconType={iconType}
            label={<EuiText size="s" color="text"><p>{label}</p></EuiText>}
            onClick={onClick}
            data-test-subj={testSubj}
            data-telemetry-id={telemetryId}
          />
        ))}
      </EuiListGroup>
    </>
  );
};
