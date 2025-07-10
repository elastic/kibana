/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { useBreadcrumbs } from '@kbn/observability-shared-plugin/public';
import { useKibana } from '../../hooks/use_kibana';
import { usePluginContext } from '../../hooks/use_plugin_context';

export function SessionsPage() {
  const {
    http: { basePath },
  } = useKibana().services;
  const { ObservabilityPageTemplate } = usePluginContext();

  useBreadcrumbs([
    {
      href: basePath.prepend('/app/mp'),
      text: 'Multiplayer',
    },
  ]);

  return (
    <ObservabilityPageTemplate
      pageHeader={{
        pageTitle: 'Sessions',
        rightSideItems: [],
      }}
    >
      {/* <HeaderMenu /> */}
      List of sessions!
    </ObservabilityPageTemplate>
  );
}
