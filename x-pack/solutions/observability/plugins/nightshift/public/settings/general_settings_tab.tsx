/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { useKibana } from '../hooks/use_kibana';
import { AppsSection } from './components/apps_section';

export const GeneralSettingsTab = () => {
  const { application } = useKibana().services;
  // Slack app routes are gated on the Streams feature privilege, not Nightshift.
  const canManageSlack = application.capabilities.streams?.manage === true;

  return <AppsSection canEdit={canManageSlack} />;
};
