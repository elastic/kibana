/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useEffect, useState } from 'react';

import { PLUGIN_ID } from '../../common';
import { PlaygroundPageMode, PlaygroundViewMode } from '../types';
import { useKibana } from './use_kibana';
import { usePlaygroundParameters } from './use_playground_parameters';

export const usePageMode = ({
  hasSelectedIndices,
  hasConnectors,
}: {
  hasSelectedIndices: boolean;
  hasConnectors: boolean;
}) => {
  const [showSetupPage, setShowSetupPage] = useState(true);
  const { pageMode, viewMode } = usePlaygroundParameters();
  const { application } = useKibana().services;

  useEffect(() => {
    if (pageMode === PlaygroundPageMode.chat) {
      if (showSetupPage && hasConnectors && hasSelectedIndices) {
        setShowSetupPage(false);
      } else if (!showSetupPage && (!hasConnectors || !hasSelectedIndices)) {
        setShowSetupPage(true);
      }
    } else {
      if (showSetupPage && hasSelectedIndices) {
        setShowSetupPage(false);
      } else if (!showSetupPage && !hasSelectedIndices) {
        setShowSetupPage(true);
      }
    }
  }, [hasSelectedIndices, showSetupPage, pageMode, hasConnectors]);
  useEffect(() => {
    // Handle Unknown modes
    if (!Object.values(PlaygroundPageMode).includes(pageMode)) {
      application.navigateToApp(PLUGIN_ID, { path: '/not_found' });
      return;
    }
    if (!Object.values(PlaygroundViewMode).includes(viewMode)) {
      application.navigateToApp(PLUGIN_ID, { path: `/${pageMode}` });
    }
  }, [application, pageMode, viewMode]);

  return {
    showSetupPage,
    pageMode,
  };
};
