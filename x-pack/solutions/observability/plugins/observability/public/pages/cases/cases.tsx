/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useEffect } from 'react';

import { observabilityFeatureId } from '../../../common';
import { usePluginContext } from '../../hooks/use_plugin_context';
import { Cases } from './components/cases';
import { CaseFeatureNoPermissions } from './components/feature_no_permissions';
import { useKibana } from '../../utils/kibana_react';

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

export function CasesPage() {
  useClearAppMenu();
  const { ObservabilityPageTemplate } = usePluginContext();
  const canUseCases = useKibana().services.cases?.helpers.canUseCases;
  const userCasesPermissions = canUseCases?.([observabilityFeatureId]);

  return userCasesPermissions?.read ? (
    <ObservabilityPageTemplate isPageDataLoaded data-test-subj="o11yCasesPage">
      <Cases permissions={userCasesPermissions} />
    </ObservabilityPageTemplate>
  ) : (
    <CaseFeatureNoPermissions />
  );
}
