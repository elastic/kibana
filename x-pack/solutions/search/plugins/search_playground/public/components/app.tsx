/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback } from 'react';
import { Route, Routes } from '@kbn/shared-ux-router';

import { useWatch } from 'react-hook-form';
import { PLUGIN_ID } from '../../common';
import { QueryMode } from './query_mode/query_mode';
import { SearchQueryMode } from './query_mode/search_query_mode';
import { ChatSetupPage } from './setup_page/chat_setup_page';
import { Header } from './header';
import { useLoadConnectors } from '../hooks/use_load_connectors';
import { ChatForm, ChatFormFields, PlaygroundPageMode, PlaygroundViewMode } from '../types';
import { Chat } from './chat';
import { SearchMode } from './search_mode/search_mode';
import { SearchPlaygroundSetupPage } from './setup_page/search_playground_setup_page';
import { usePageMode } from '../hooks/use_page_mode';
import { useKibana } from '../hooks/use_kibana';
import { usePlaygroundParameters } from '../hooks/use_playground_parameters';
import { useSearchPlaygroundFeatureFlag } from '../hooks/use_search_playground_feature_flag';
import {
  PLAYGROUND_CHAT_QUERY_PATH,
  PLAYGROUND_SEARCH_QUERY_PATH,
  SEARCH_PLAYGROUND_CHAT_PATH,
  SEARCH_PLAYGROUND_SEARCH_PATH,
} from '../routes';

export interface AppProps {
  showDocs?: boolean;
}

export const App: React.FC<AppProps> = ({ showDocs = false }) => {
  const isSearchModeEnabled = useSearchPlaygroundFeatureFlag();
  const { pageMode, viewMode } = usePlaygroundParameters();
  const { application } = useKibana().services;
  const { data: connectors } = useLoadConnectors();
  const hasSelectedIndices = Boolean(
    useWatch<ChatForm, ChatFormFields.indices>({
      name: ChatFormFields.indices,
    }).length
  );
  const navigateToView = useCallback(
    (page: PlaygroundPageMode, view?: PlaygroundViewMode) => {
      application.navigateToApp(PLUGIN_ID, {
        path: view && view !== PlaygroundViewMode.preview ? `/${page}/${view}` : `/${page}`,
      });
    },
    [application]
  );
  const handleModeChange = (id: PlaygroundViewMode) => navigateToView(pageMode, id);
  const handlePageModeChange = (mode: PlaygroundPageMode) => navigateToView(mode, viewMode);
  const { showSetupPage } = usePageMode({
    hasSelectedIndices,
    hasConnectors: Boolean(connectors?.length),
  });

  return (
    <>
      <Header
        showDocs={showDocs}
        onModeChange={handleModeChange}
        isActionsDisabled={showSetupPage}
        onSelectPageModeChange={handlePageModeChange}
      />
      <Routes>
        {showSetupPage ? (
          <>
            <Route path={SEARCH_PLAYGROUND_CHAT_PATH} component={ChatSetupPage} />
            {isSearchModeEnabled && (
              <Route path={SEARCH_PLAYGROUND_SEARCH_PATH} component={SearchPlaygroundSetupPage} />
            )}
          </>
        ) : (
          <>
            <Route exact path={SEARCH_PLAYGROUND_CHAT_PATH} component={Chat} />
            <Route exact path={PLAYGROUND_CHAT_QUERY_PATH} component={QueryMode} />
            {isSearchModeEnabled && (
              <>
                <Route exact path={SEARCH_PLAYGROUND_SEARCH_PATH} component={SearchMode} />
                <Route exact path={PLAYGROUND_SEARCH_QUERY_PATH} component={SearchQueryMode} />
              </>
            )}
          </>
        )}
      </Routes>
    </>
  );
};
