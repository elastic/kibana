/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import createContainer from 'constate';
import { useState, useCallback } from 'react';

export type ModuleId = 'logs_ui_analysis' | 'logs_ui_categories';

export const moduleIds = ['logs_ui_analysis', 'logs_ui_categories'] as const;

type FlyoutView =
  | { view: 'hidden' }
  | { view: 'moduleList' }
  | { view: 'moduleSetup'; module: ModuleId };

export const useLogAnalysisSetupFlyoutState = ({
  initialFlyoutView = { view: 'hidden' },
}: {
  initialFlyoutView?: FlyoutView;
}) => {
  const [flyoutView, setFlyoutView] = useState<FlyoutView>(initialFlyoutView);

  const closeFlyout = useCallback(() => setFlyoutView({ view: 'hidden' }), []);
  const showModuleList = useCallback(() => setFlyoutView({ view: 'moduleList' }), []);
  const showModuleSetup = useCallback(
    (module: ModuleId) => {
      setFlyoutView({ view: 'moduleSetup', module });
    },
    [setFlyoutView]
  );

  return {
    closeFlyout,
    flyoutView,
    setFlyoutView,
    showModuleList,
    showModuleSetup,
  };
};

export const [LogAnalysisSetupFlyoutStateProvider, useLogAnalysisSetupFlyoutStateContext] =
  createContainer(useLogAnalysisSetupFlyoutState);
