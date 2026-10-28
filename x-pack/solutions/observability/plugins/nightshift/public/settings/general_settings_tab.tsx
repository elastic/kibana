/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiSpacer } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { getNightshiftCapabilities } from '@kbn/nightshift-shared';
import { DeveloperModeBadge } from '../components/ui/developer_mode_badge';
import { useKibana } from '../hooks/use_kibana';
import { AppsSection } from './components/apps_section';
import { ConnectorsSection } from './components/connectors_section';
import { DeveloperModeSection } from './components/developer_mode_section';
import { KnowledgePurgeSection } from './components/knowledge_purge_section';
import { SettingsSection } from './components/settings_section';
import { useDeveloperMode } from '../hooks/use_developer_mode';

export const GeneralSettingsTab = () => {
  const { application } = useKibana().services;
  const { canManageAndConfigure } = getNightshiftCapabilities(application.capabilities.nightshift);
  const { isDeveloperMode, isSaving, setDeveloperMode } = useDeveloperMode();
  const canSaveAdvancedSettings = application.capabilities.advancedSettings?.save === true;

  return (
    <>
      <ConnectorsSection />
      <AppsSection canEdit={canManageAndConfigure} />

      <EuiSpacer />

      <DeveloperModeSection
        isDeveloperMode={isDeveloperMode}
        setDeveloperMode={setDeveloperMode}
        isDeveloperModeSaving={isSaving}
        canSaveAdvancedSettings={canSaveAdvancedSettings}
      />

      {isDeveloperMode && (
        <>
          <EuiSpacer />

          <SettingsSection
            title={i18n.translate('xpack.nightshift.settings.knowledgeTitle', {
              defaultMessage: 'Knowledge',
            })}
            titleAdornment={<DeveloperModeBadge />}
            data-test-subj="nightshiftKnowledgeSettingsSection"
          >
            <KnowledgePurgeSection canManage={canManageAndConfigure} />
          </SettingsSection>
        </>
      )}
    </>
  );
};
