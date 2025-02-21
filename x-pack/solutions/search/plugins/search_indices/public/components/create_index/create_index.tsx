/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useState } from 'react';

import type { IndicesStatusResponse } from '../../../common';

import { AnalyticsEvents } from '../../analytics/constants';
import { AvailableLanguages } from '../../code_examples';
import { useUserPrivilegesQuery } from '../../hooks/api/use_user_permissions';
import { useKibana } from '../../hooks/use_kibana';
import { useUsageTracker } from '../../hooks/use_usage_tracker';
import { CreateIndexFormState } from '../../types';
import { generateRandomIndexName } from '../../utils/indices';
import { getDefaultCodingLanguage } from '../../utils/language';

import { CreateIndexPanel } from '../shared/create_index_panel/create_index_panel';

import { CreateIndexCodeView } from './create_index_code_view';
import { CreateIndexUIView } from './create_index_ui_view';
import { WorkflowId } from '../../code_examples/workflows';
import { useWorkflow } from '../shared/hooks/use_workflow';

function initCreateIndexState() {
  const defaultIndexName = generateRandomIndexName();
  return {
    indexName: defaultIndexName,
    defaultIndexName,
    codingLanguage: getDefaultCodingLanguage(),
  };
}

interface CreateIndexProps {
  indicesData?: IndicesStatusResponse;
}

enum CreateIndexViewMode {
  UI = 'ui',
  Code = 'code',
}

export const CreateIndex = ({ indicesData }: CreateIndexProps) => {
  const { application } = useKibana().services;
  const [formState, setFormState] = useState<CreateIndexFormState>(initCreateIndexState);
  const { data: userPrivileges } = useUserPrivilegesQuery(formState.defaultIndexName);
  const [createIndexView, setCreateIndexView] = useState<CreateIndexViewMode>(
    userPrivileges?.privileges.canManageIndex === false
      ? CreateIndexViewMode.Code
      : CreateIndexViewMode.UI
  );
  const {
    workflow,
    setSelectedWorkflowId,
    createIndexExamples: selectedCodeExamples,
  } = useWorkflow();
  const usageTracker = useUsageTracker();
  const onChangeView = useCallback(
    (id: string) => {
      switch (id) {
        case CreateIndexViewMode.UI:
          usageTracker.click(AnalyticsEvents.createIndexShowUIClick);
          setCreateIndexView(CreateIndexViewMode.UI);
          return;
        case CreateIndexViewMode.Code:
          usageTracker.click(AnalyticsEvents.createIndexShowCodeClick);
          setCreateIndexView(CreateIndexViewMode.Code);
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
        AnalyticsEvents.createIndexLanguageSelect,
        `${AnalyticsEvents.createIndexLanguageSelect}_${language}`,
      ]);
    },
    [usageTracker, formState, setFormState]
  );
  const onClose = useCallback(() => {
    application.navigateToApp('management', { deepLinkId: 'index_management' });
  }, [application]);

  return (
    <CreateIndexPanel
      createIndexView={createIndexView}
      onChangeView={onChangeView}
      onClose={onClose}
    >
      {createIndexView === CreateIndexViewMode.UI && (
        <CreateIndexUIView
          formState={formState}
          setFormState={setFormState}
          userPrivileges={userPrivileges}
        />
      )}
      {createIndexView === CreateIndexViewMode.Code && (
        <CreateIndexCodeView
          indicesData={indicesData}
          selectedLanguage={formState.codingLanguage}
          indexName={formState.indexName}
          changeCodingLanguage={onChangeCodingLanguage}
          changeWorkflowId={(workflowId: WorkflowId) => {
            setSelectedWorkflowId(workflowId);
            usageTracker.click([
              AnalyticsEvents.createIndexWorkflowSelect,
              `${AnalyticsEvents.createIndexWorkflowSelect}_${workflowId}`,
            ]);
          }}
          selectedWorkflow={workflow}
          selectedCodeExamples={selectedCodeExamples}
          canCreateApiKey={userPrivileges?.privileges.canCreateApiKeys}
          analyticsEvents={{
            runInConsole: AnalyticsEvents.createIndexRunInConsole,
            installCommands: AnalyticsEvents.createIndexCodeCopyInstall,
            createIndex: AnalyticsEvents.createIndexCodeCopy,
          }}
        />
      )}
    </CreateIndexPanel>
  );
};
