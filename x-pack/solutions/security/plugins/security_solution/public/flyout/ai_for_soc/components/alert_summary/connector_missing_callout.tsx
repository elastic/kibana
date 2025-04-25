/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { memo, useCallback } from 'react';
import { EuiCallOut, EuiLink } from '@elastic/eui';
import { useAssistantContext } from '@kbn/elastic-assistant';
import * as i18n from '../../constants/translations';

interface Props {
  canSeeAdvancedSettings: boolean;
}

export const ConnectorMissingCallout = memo(({ canSeeAdvancedSettings }: Props) => {
  const { navigateToApp } = useAssistantContext();
  const goToKibanaSettings = useCallback(
    () => navigateToApp('management', { path: '/kibana/settings?query=defaultAIConnector' }),
    [navigateToApp]
  );

  return (
    <EuiCallOut title={i18n.MISSING_CONNECTOR} color="danger" iconType="error">
      <p>
        {canSeeAdvancedSettings
          ? i18n.CONNECTOR_MISSING_MESSAGE_ADMIN
          : i18n.CONNECTOR_MISSING_MESSAGE}
        {canSeeAdvancedSettings && (
          <>
            {' '}
            <EuiLink onClick={goToKibanaSettings}>{i18n.ADVANCED_SETTINGS_LINK_TITLE}</EuiLink>
            {'.'}
          </>
        )}
      </p>
    </EuiCallOut>
  );
});

ConnectorMissingCallout.displayName = 'ConnectorMissingCallout';
