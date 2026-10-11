/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiLink } from '@elastic/eui';
import type { CoreStart } from '@kbn/core/public';
import type { LinkId } from '@kbn/deeplinks-management';
import { useKibana } from '@kbn/kibana-react-plugin/public';
import * as settingsI18n from '../settings_translations';

/** Stack Management's "Feature Settings" page, registered by `searchInferenceEndpoints`. */
const FEATURE_SETTINGS_DEEP_LINK_ID: LinkId = 'model_settings';

interface FeatureSettingsLinkProps {
  'data-test-subj'?: string;
}

/**
 * Link to Stack Management > Feature Settings. Opens a new tab because unsaved Worker edits live
 * only in page state.
 */
export const FeatureSettingsLink: React.FC<FeatureSettingsLinkProps> = ({
  'data-test-subj': dataTestSubj,
}) => {
  const {
    services: { application },
  } = useKibana<CoreStart>();

  return (
    <EuiLink
      href={application.getUrlForApp('management', { deepLinkId: FEATURE_SETTINGS_DEEP_LINK_ID })}
      target="_blank"
      external
      data-test-subj={dataTestSubj}
    >
      {settingsI18n.FEATURE_SETTINGS_LINK}
    </EuiLink>
  );
};
