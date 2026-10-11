/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiSpacer } from '@elastic/eui';
import { getNightshiftCapabilities } from '@kbn/nightshift-shared';
import { useKibana } from '../hooks/use_kibana';
import { AppsSection } from './components/apps_section';
import { DeveloperModeSection } from './components/developer_mode_section';
import { useDeveloperMode } from './hooks/use_developer_mode';

export const GeneralSettingsTab = () => {
  const { application } = useKibana().services;
  const { canManageAndConfigure } = getNightshiftCapabilities(application.capabilities.nightshift);
  const { isDeveloperMode, isSaving, setDeveloperMode } = useDeveloperMode();
  const canSaveAdvancedSettings = application.capabilities.advancedSettings?.save === true;

  return (
    <>
      <AppsSection canEdit={canManageAndConfigure} />

      <EuiSpacer />

      <DeveloperModeSection
        isDeveloperMode={isDeveloperMode}
        setDeveloperMode={setDeveloperMode}
        isDeveloperModeSaving={isSaving}
        canSaveAdvancedSettings={canSaveAdvancedSettings}
      />
    </>
  );
};
