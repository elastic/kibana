/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { LazyObservabilityPageTemplateProps } from '@kbn/observability-shared-plugin/public';
import React from 'react';
import { useKibana } from '@kbn/kibana-react-plugin/public';

import { ClientPluginsStart } from '../../../../../plugin';

export const SyntheticsPageTemplateComponent = (props: LazyObservabilityPageTemplateProps) => {
  const { observabilityShared } = useKibana<ClientPluginsStart>().services;
  const PageTemplateComponent = observabilityShared.navigation.PageTemplate;

  return <PageTemplateComponent {...props} />;
};
