/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { KbnDangerCallout } from '@kbn/ui-callout';
import { useFeatureSettingsUrl } from '../watches/components/feature_settings_link';
import * as i18n from './translations';

/** Tells the user Workers can't run until the space has an AI model, with a way to set one up. */
export const NoModelCallout: React.FC = () => {
  const featureSettingsUrl = useFeatureSettingsUrl();

  return (
    <KbnDangerCallout
      announceOnMount
      title={i18n.NO_MODEL_CALLOUT_TITLE}
      text={i18n.NO_MODEL_CALLOUT_TEXT}
      actionProps={{
        primary: {
          children: i18n.NO_MODEL_CALLOUT_ACTION,
          href: featureSettingsUrl,
          target: '_blank',
          iconType: 'popout',
          iconSide: 'right',
          'data-test-subj': 'alertZeroOnboardingNoModelFeatureSettingsButton',
        },
      }}
      data-test-subj="alertZeroOnboardingNoModelCallout"
    />
  );
};
