/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiLink } from '@elastic/eui';
import type { CoreStart } from '@kbn/core/public';
import { useKibana } from '@kbn/kibana-react-plugin/public';
import * as settingsI18n from '../settings_translations';

const MANAGEMENT_APP_ID = 'management';
/** The Search Inference Endpoints `model_settings` app, titled "Feature Settings". */
const FEATURE_SETTINGS_PATH = '/modelManagement/model_settings';

interface FeatureSettingsLinkProps {
  'data-test-subj'?: string;
}

/** Link to Stack Management > Feature Settings, where each AlertZero model tier is picked. */
export const FeatureSettingsLink: React.FC<FeatureSettingsLinkProps> = ({
  'data-test-subj': dataTestSubj,
}) => {
  const {
    services: { application },
  } = useKibana<CoreStart>();
  const href = application.getUrlForApp(MANAGEMENT_APP_ID, { path: FEATURE_SETTINGS_PATH });

  return (
    <EuiLink
      href={href}
      onClick={(event: React.MouseEvent) => {
        if (event.metaKey || event.ctrlKey || event.shiftKey || event.button !== 0) {
          return;
        }
        event.preventDefault();
        void application.navigateToApp(MANAGEMENT_APP_ID, { path: FEATURE_SETTINGS_PATH });
      }}
      data-test-subj={dataTestSubj}
    >
      {settingsI18n.FEATURE_SETTINGS_LINK}
    </EuiLink>
  );
};
