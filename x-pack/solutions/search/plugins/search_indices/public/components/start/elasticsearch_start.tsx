/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useEffect, useState } from 'react';
import { i18n } from '@kbn/i18n';

import { SEARCH_HOMEPAGE } from '@kbn/deeplinks-search';
import { GLOBAL_EMPTY_STATE_SKIP_KEY } from '@kbn/search-shared-ui';
import type { IndicesStatusResponse } from '../../../common';

import { AnalyticsEvents } from '../../analytics/constants';
import { useUsageTracker } from '../../hooks/use_usage_tracker';
import { generateRandomIndexName } from '../../utils/indices';
import { getDefaultCodingLanguage } from '../../utils/language';

import { CreateIndexUIView } from './create_index';
import type { CreateIndexFormState } from '../../types';

import { CreateIndexPanel } from '../shared/create_index_panel/create_index_panel';
import { useKibana } from '../../hooks/use_kibana';
import { useUserPrivilegesQuery } from '../../hooks/api/use_user_permissions';

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
}

export const ElasticsearchStart: React.FC<ElasticsearchStartProps> = () => {
  const { application } = useKibana().services;
  const [formState, setFormState] = useState<CreateIndexFormState>(initCreateIndexState);
  const { data: userPrivileges } = useUserPrivilegesQuery(formState.defaultIndexName);

  const usageTracker = useUsageTracker();

  useEffect(() => {
    usageTracker.load(AnalyticsEvents.startPageOpened);
  }, [usageTracker]);

  const onClose = useCallback(() => {
    localStorage.setItem(GLOBAL_EMPTY_STATE_SKIP_KEY, 'true');
    application.navigateToApp(SEARCH_HOMEPAGE);
  }, [application]);

  return (
    <CreateIndexPanel
      title={i18n.translate('xpack.searchIndices.startPage.createIndex.title', {
        defaultMessage: 'Create your first index',
      })}
      onClose={onClose}
      showSkip
    >
      <CreateIndexUIView
        userPrivileges={userPrivileges}
        formState={formState}
        setFormState={setFormState}
      />
    </CreateIndexPanel>
  );
};
