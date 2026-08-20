/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiCode, EuiFormRow, EuiSpacer } from '@elastic/eui';
import { KbnWarningCallout } from '@kbn/ui-callout';
import type { WatchGeneralSettings } from '@kbn/pnd-common';
import { SettingsSection } from './settings_section';
import * as i18n from '../settings_translations';

interface WatchGeneralSectionProps {
  general: WatchGeneralSettings;
}

export const WatchGeneralSection: React.FC<WatchGeneralSectionProps> = ({ general }) => (
  <SettingsSection
    title={i18n.GENERAL_SECTION_TITLE}
    subtitle={i18n.GENERAL_SECTION_SUBTITLE}
    data-test-subj="pndWatchGeneralSection"
  >
    <EuiFormRow label={i18n.RUN_AS_IDENTITY_LABEL} helpText={i18n.RUN_AS_IDENTITY_HELP} fullWidth>
      {/* Read-only until IAM run-as support lands, so it reads as an identity rather than a field. */}
      <EuiCode data-test-subj="pndWatchRunAsIdentity">{general.runAsIdentity}</EuiCode>
    </EuiFormRow>

    {general.showMvpScopeWarning ? (
      <>
        <EuiSpacer size="m" />
        <KbnWarningCallout
          announceOnMount
          title={i18n.MVP_SCOPE_CALLOUT_TITLE}
          text={<p>{i18n.MVP_SCOPE_CALLOUT_BODY}</p>}
          size="s"
          data-test-subj="pndWatchMvpScopeCallout"
        />
      </>
    ) : null}
  </SettingsSection>
);
