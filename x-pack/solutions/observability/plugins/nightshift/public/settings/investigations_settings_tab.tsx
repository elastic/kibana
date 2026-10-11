/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useState } from 'react';
import { useUnsavedChangesPrompt } from '@kbn/unsaved-changes-prompt';
import { useKibana } from '../hooks/use_kibana';
import { RunLimitsSection } from './components/run_limits_section';
import { SettingsNoPermissionCallout } from './components/settings_no_permission_callout';
import { useCanEditSettings } from './components/use_detection_settings_form';

export const InvestigationsSettingsTab = () => {
  const { appParams, application, http, overlays } = useKibana().services;
  const canEditSettings = useCanEditSettings();
  const [hasRunLimitChanges, setHasRunLimitChanges] = useState(false);

  useUnsavedChangesPrompt({
    hasUnsavedChanges: hasRunLimitChanges,
    http,
    openConfirm: overlays.openConfirm,
    navigateToUrl: application.navigateToUrl,
    history: appParams.history,
    shouldPromptOnReplace: false,
  });

  return (
    <>
      {!canEditSettings && <SettingsNoPermissionCallout />}
      <RunLimitsSection groups={['investigation']} onUnsavedChangesChange={setHasRunLimitChanges} />
    </>
  );
};
