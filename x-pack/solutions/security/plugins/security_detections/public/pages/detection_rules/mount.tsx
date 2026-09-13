/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * Mounts the detection rules management app into the given DOM element.
 *
 * Called by the management section's `registerApp` mount hook. Constructs the
 * API service from the live `CoreStart.http`, wraps the page in a
 * `QueryClientProvider` so hooks can issue queries, and returns an unmount
 * function that React uses to clean up.
 */

import React from 'react';
import ReactDOM from 'react-dom';
import type { CoreStart } from '@kbn/core/public';
import type { ManagementAppMountParams } from '@kbn/management-plugin/public';
import { QueryClient, QueryClientProvider } from '@kbn/react-query';
import { DetectionRulesApi } from '../../services/detection_rules_api';
import { DetectionRulesContext } from './detection_rules_context';
import { DetectionRulesPage } from './detection_rules_page';

export const mountDetectionRulesApp = (
  params: ManagementAppMountParams,
  coreStart: CoreStart
): (() => void) => {
  const api = new DetectionRulesApi(coreStart.http);
  const queryClient = new QueryClient();

  ReactDOM.render(
    <QueryClientProvider client={queryClient}>
      <DetectionRulesContext.Provider value={{ api, notifications: coreStart.notifications }}>
        <DetectionRulesPage />
      </DetectionRulesContext.Provider>
    </QueryClientProvider>,
    params.element
  );

  return () => {
    ReactDOM.unmountComponentAtNode(params.element);
  };
};
