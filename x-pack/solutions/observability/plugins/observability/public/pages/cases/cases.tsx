/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { CASES_APP_ID } from '@kbn/cases-plugin/common';

import { observabilityFeatureId } from '../../../common';
import { usePluginContext } from '../../hooks/use_plugin_context';
import { Cases } from './components/cases';
import { CaseFeatureNoPermissions } from './components/feature_no_permissions';
import { HeaderMenu } from '../overview/components/header_menu/header_menu';
import { useKibana } from '../../utils/kibana_react';

/** Sends old Observability Cases links to the same page of the top-level Cases app. */
function RedirectToCasesApp() {
  const { application } = useKibana().services;
  const { pathname, search, hash } = useLocation();

  useEffect(() => {
    void application.navigateToApp(CASES_APP_ID, {
      path: `${pathname.replace(/^\/cases/, '')}${search}${hash}`,
      replace: true,
    });
  }, [application, pathname, search, hash]);

  return null;
}

export function CasesPage() {
  const topLevelAppEnabled = useKibana().services.cases?.config.topLevelAppEnabled ?? false;

  return topLevelAppEnabled ? <RedirectToCasesApp /> : <ObservabilityCasesPage />;
}

function ObservabilityCasesPage() {
  const { ObservabilityPageTemplate } = usePluginContext();
  const canUseCases = useKibana().services.cases?.helpers.canUseCases;
  const userCasesPermissions = canUseCases?.([observabilityFeatureId]);

  return userCasesPermissions?.read ? (
    <ObservabilityPageTemplate
      isPageDataLoaded
      data-test-subj="o11yCasesPage"
      pageSectionProps={{ paddingSize: 'none' }}
    >
      <HeaderMenu />
      <Cases permissions={userCasesPermissions} />
    </ObservabilityPageTemplate>
  ) : (
    <CaseFeatureNoPermissions />
  );
}
