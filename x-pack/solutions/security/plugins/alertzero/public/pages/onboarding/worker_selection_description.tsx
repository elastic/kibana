/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiLink, EuiText } from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n-react';
import { FeatureSettingsLink } from '../watches/components/feature_settings_link';
import { ONBOARDING_READ_MORE_URL_PLACEHOLDER } from './constants';
import * as i18n from './translations';

interface Props {
  isSaving: boolean;
  onWatchSettingsClick: () => void;
}

export const WorkerSelectionDescription: React.FC<Props> = ({ isSaving, onWatchSettingsClick }) => (
  <EuiText>
    <p>
      <FormattedMessage
        id="xpack.alertzero.onboarding.subtitle"
        defaultMessage="A Watch is a small team of Workers focused on one job, such as triaging alerts or hunting for threats. Workers use the AI models configured in {featureSettingsLink}, and by default they propose actions for you to approve or decline. Choose which Workers to turn on. You can change their settings later in {watchSettingsLink}."
        values={{
          featureSettingsLink: (
            <FeatureSettingsLink data-test-subj="alertZeroOnboardingFeatureSettingsLink" />
          ),
          watchSettingsLink: (
            <EuiLink
              onClick={onWatchSettingsClick}
              disabled={isSaving}
              data-test-subj="alertZeroOnboardingWatchSettingsLink"
            >
              {i18n.WATCH_SETTINGS}
            </EuiLink>
          ),
        }}
      />
      <br />
      <EuiLink
        href={ONBOARDING_READ_MORE_URL_PLACEHOLDER}
        target="_blank"
        external
        data-test-subj="alertZeroOnboardingReadMoreLink"
      >
        {i18n.READ_MORE}
      </EuiLink>
    </p>
  </EuiText>
);
