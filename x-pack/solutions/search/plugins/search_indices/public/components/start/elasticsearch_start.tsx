/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useEffect, useState } from 'react';
import { i18n } from '@kbn/i18n';

import type { IndicesStatusResponse, UserStartPrivilegesResponse } from '../../../common';

import { AnalyticsEvents } from '../../analytics/constants';
import { AvailableLanguages } from '../../code_examples';
import { useUsageTracker } from '../../hooks/use_usage_tracker';
import { generateRandomIndexName } from '../../utils/indices';
import { getDefaultCodingLanguage } from '../../utils/language';

import { CreateIndexUIView } from './create_index';
import { CreateIndexCodeView } from '../shared/create_index_code_view';
import { CreateIndexFormState, CreateIndexViewMode } from '../../types';

import { CreateIndexPanel } from '../shared/create_index_panel';
import { useKibana } from '../../hooks/use_kibana';

function initCreateIndexState(): CreateIndexFormState {
  const defaultIndexName = generateRandomIndexName();
  return {
    indexName: defaultIndexName,
    defaultIndexName,
    codingLanguage: getDefaultCodingLanguage(),
  };
}

export interface ElasticsearchStartProps {
  indicesData?: IndicesStatusResponse;
  userPrivileges?: UserStartPrivilegesResponse;
}

export const ElasticsearchStart = ({ userPrivileges }: ElasticsearchStartProps) => {
  const { application } = useKibana().services;
  const [createIndexView, setCreateIndexViewMode] = useState<CreateIndexViewMode>(
    userPrivileges?.privileges.canCreateIndex === false
      ? CreateIndexViewMode.Code
      : CreateIndexViewMode.UI
  );
  const [formState, setFormState] = useState<CreateIndexFormState>(initCreateIndexState);
  const usageTracker = useUsageTracker();

  useEffect(() => {
    usageTracker.load(AnalyticsEvents.startPageOpened);
  }, [usageTracker]);
  useEffect(() => {
    if (userPrivileges === undefined) return;
    if (userPrivileges.privileges.canCreateIndex === false) {
      setCreateIndexViewMode(CreateIndexViewMode.Code);
    }
  }, [userPrivileges]);

  const onChangeView = useCallback(
    (id: string) => {
      switch (id) {
        case CreateIndexViewMode.UI:
          usageTracker.click(AnalyticsEvents.startPageShowCreateIndexUIClick);
          setCreateIndexViewMode(CreateIndexViewMode.UI);
          return;
        case CreateIndexViewMode.Code:
          usageTracker.click(AnalyticsEvents.startPageShowCodeClick);
          setCreateIndexViewMode(CreateIndexViewMode.Code);
          return;
      }
    },
    [usageTracker]
  );
  const onChangeCodingLanguage = useCallback(
    (language: AvailableLanguages) => {
      setFormState({
        ...formState,
        codingLanguage: language,
      });
      usageTracker.count([
        AnalyticsEvents.startCreateIndexLanguageSelect,
        `${AnalyticsEvents.startCreateIndexLanguageSelect}_${language}`,
      ]);
    },
    [usageTracker, formState, setFormState]
  );
  const onClose = useCallback(() => {
    application.navigateToApp('management', { deepLinkId: 'index_management' });
  }, [application]);

  return (
    <CreateIndexPanel
      title={i18n.translate('xpack.searchIndices.startPage.createIndex.title', {
        defaultMessage: 'Create your first index',
      })}
      createIndexView={createIndexView}
      onChangeView={onChangeView}
      onClose={onClose}
      showSkip
      showCallouts
    >
      {createIndexView === CreateIndexViewMode.UI && (
        <CreateIndexUIView
          userPrivileges={userPrivileges}
          formState={formState}
          setFormState={setFormState}
        />
      )}
      {createIndexView === CreateIndexViewMode.Code && (
        <CreateIndexCodeView
          selectedLanguage={formState.codingLanguage}
          indexName={formState.indexName}
          changeCodingLanguage={onChangeCodingLanguage}
          canCreateApiKey={userPrivileges?.privileges.canCreateApiKeys}
          analyticsEvents={{
            runInConsole: AnalyticsEvents.startCreateIndexRunInConsole,
            installCommands: AnalyticsEvents.startCreateIndexCodeCopyInstall,
            createIndex: AnalyticsEvents.startCreateIndexCodeCopy,
          }}
        />
      )}
    </CreateIndexPanel>
  );
};
