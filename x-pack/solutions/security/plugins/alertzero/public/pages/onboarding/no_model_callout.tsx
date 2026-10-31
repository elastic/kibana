/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import type { CoreStart } from '@kbn/core/public';
import { useKibana } from '@kbn/kibana-react-plugin/public';
import { KbnDangerCallout } from '@kbn/ui-callout';
import { useFeatureSettingsUrl } from '../watches/components/feature_settings_link';
import * as i18n from './translations';

const CONNECTORS_PATH = '/insightsAndAlerting/triggersActionsConnectors/connectors';

/**
 * Tells the user Workers can't run until the space has an AI model. A space with no AI connector
 * needs one added first, so that is the primary action; Feature settings covers a space that has a
 * connector but no model chosen.
 */
export const NoModelCallout: React.FC = () => {
  const {
    services: { application },
  } = useKibana<CoreStart>();
  const featureSettingsUrl = useFeatureSettingsUrl();
  const connectorsUrl = application.getUrlForApp('management', { path: CONNECTORS_PATH });

  return (
    <KbnDangerCallout
      announceOnMount
      title={i18n.NO_MODEL_CALLOUT_TITLE}
      text={i18n.NO_MODEL_CALLOUT_TEXT}
      actionProps={{
        primary: {
          children: i18n.NO_MODEL_CALLOUT_ADD_CONNECTOR_ACTION,
          href: connectorsUrl,
          target: '_blank',
          iconType: 'external',
          iconSide: 'right',
          'data-test-subj': 'alertZeroOnboardingNoModelAddConnectorButton',
        },
        secondary: {
          children: i18n.NO_MODEL_CALLOUT_ACTION,
          href: featureSettingsUrl,
          target: '_blank',
          iconType: 'external',
          iconSide: 'right',
          'data-test-subj': 'alertZeroOnboardingNoModelFeatureSettingsButton',
        },
      }}
      data-test-subj="alertZeroOnboardingNoModelCallout"
    />
  );
};
