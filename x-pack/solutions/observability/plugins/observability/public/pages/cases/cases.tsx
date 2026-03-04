/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useEffect } from 'react';
import { CaseCallouts } from '@kbn/cases-plugin/public';

import { observabilityFeatureId } from '../../../common';
import { usePluginContext } from '../../hooks/use_plugin_context';
import { Cases } from './components/cases';
import { CaseFeatureNoPermissions } from './components/feature_no_permissions';
import { useKibana } from '../../utils/kibana_react';
import { getObservabilityCasesHeaderAppActionsConfig } from '../../header_app_actions/header_app_actions_config';

/** Clear the App Menu (optional) slot for Cases so it does not show "Add data" as the only item. */
function useClearAppMenu() {
  const { appMountParameters } = usePluginContext();
  useEffect(() => {
    const setHeaderActionMenu = appMountParameters?.setHeaderActionMenu;
    if (setHeaderActionMenu) {
      setHeaderActionMenu(undefined);
      return () => setHeaderActionMenu(undefined);
    }
  }, [appMountParameters?.setHeaderActionMenu]);
}

/** Set global header app actions (e.g. New) when Cases page is active. */
function useHeaderAppActions() {
  const { chrome } = useKibana().services;
  useEffect(() => {
    if (chrome?.setHeaderAppActionsConfig) {
      chrome.setHeaderAppActionsConfig(getObservabilityCasesHeaderAppActionsConfig());
      return () => chrome.setHeaderAppActionsConfig(undefined);
    }
  }, [chrome]);
}

export function CasesPage() {
  useClearAppMenu();
  useHeaderAppActions();
  const { ObservabilityPageTemplate } = usePluginContext();
  const canUseCases = useKibana().services.cases?.helpers.canUseCases;
  const userCasesPermissions = canUseCases?.([observabilityFeatureId]);

  return userCasesPermissions?.read ? (
    <>
      <CaseCallouts />
      <ObservabilityPageTemplate isPageDataLoaded data-test-subj="o11yCasesPage">
        <Cases permissions={userCasesPermissions} />
      </ObservabilityPageTemplate>
    </>
  ) : (
    <CaseFeatureNoPermissions />
  );
}
