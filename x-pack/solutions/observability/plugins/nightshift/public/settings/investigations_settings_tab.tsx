/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { RunLimitsSection } from './components/run_limits_section';
import { SettingsNoPermissionCallout } from './components/settings_no_permission_callout';
import { useCanEditSettings } from './components/use_detection_settings_form';

export const InvestigationsSettingsTab = () => {
  const canEditSettings = useCanEditSettings();

  return (
    <>
      {!canEditSettings && <SettingsNoPermissionCallout />}
      <RunLimitsSection groups={['investigation']} />
    </>
  );
};
