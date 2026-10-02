/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiLink } from '@elastic/eui';
import { useKibana } from '@kbn/kibana-react-plugin/public';
import { useLocatorUrl } from '@kbn/share-plugin/public';
import type { SharePluginStart } from '@kbn/share-plugin/public';
import * as settingsI18n from '../settings_translations';

/** Registered by `searchInferenceEndpoints`; resolves to the "Feature Settings" page. */
const FEATURE_SETTINGS_LOCATOR_ID = 'SEARCH_INFERENCE_ENDPOINTS';

interface FeatureSettingsLinkProps {
  'data-test-subj'?: string;
}

/** Link to Stack Management > Feature Settings; plain text when that page has no locator. */
export const FeatureSettingsLink: React.FC<FeatureSettingsLinkProps> = ({
  'data-test-subj': dataTestSubj,
}) => {
  const {
    services: { share },
  } = useKibana<{ share?: SharePluginStart }>();
  const locator = share?.url.locators.get(FEATURE_SETTINGS_LOCATOR_ID);
  const href = useLocatorUrl(locator, {});

  if (!locator || !href) {
    return <>{settingsI18n.FEATURE_SETTINGS_LINK}</>;
  }

  return (
    <EuiLink
      href={href}
      onClick={(event: React.MouseEvent) => {
        if (event.metaKey || event.ctrlKey || event.shiftKey || event.button !== 0) {
          return;
        }
        event.preventDefault();
        void locator.navigate({});
      }}
      data-test-subj={dataTestSubj}
    >
      {settingsI18n.FEATURE_SETTINGS_LINK}
    </EuiLink>
  );
};
