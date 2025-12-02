/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiButton, EuiCallOut, EuiSpacer } from '@elastic/eui';
import React, { memo, useCallback, useMemo, useState } from 'react';
import { i18n } from '@kbn/i18n';
import { useUserData } from '../user_info';

export const NO_INTEGRATION_CALLOUT_TEST_ID = 'alerts-page-no-integration-callout';
export const NO_INTEGRATION_CALLOUT_DISMISS_BUTTON_TEST_ID =
  'alerts-page-no-integration-callout-dismiss-button';

const NO_API_INTEGRATION_KEY_CALLOUT_TITLE = i18n.translate(
  'xpack.securitySolution.alertsPage.noApiIntegrationKeyCallOut.titleLabel',
  {
    defaultMessage: 'API integration key required',
  }
);
const NO_API_INTEGRATION_KEY_CALLOUT_MSG = i18n.translate(
  'xpack.securitySolution.alertsPage.noApiIntegrationKeyCallOut.messageLabel',
  {
    defaultMessage: `A new encryption key is generated for saved objects each time you start Kibana. Without a persistent key, you cannot delete or modify rules after Kibana restarts. To set a persistent key, add the xpack.encryptedSavedObjects.encryptionKey setting with any text value of 32 or more characters to the kibana.yml file.`,
  }
);
const DISMISS_CALLOUT = i18n.translate(
  'xpack.securitySolution.alertsPage.dismissNoApiIntegrationKey.buttonLabel',
  {
    defaultMessage: 'Dismiss',
  }
);

/**
 * Show a callout if an API integration key is needed.
 * Users can dismiss the callout for the current browser tab.
 */
export const NoApiIntegrationKeyCallOut = memo(() => {
  const [isCalloutDismissed, setIsCalloutDismissed] = useState(false);
  const dismissCallOut = useCallback(() => setIsCalloutDismissed(true), [setIsCalloutDismissed]);

  const [{ hasEncryptionKey }] = useUserData();

  const showCallout = useMemo(
    () => hasEncryptionKey != null && !hasEncryptionKey && !isCalloutDismissed,
    [hasEncryptionKey, isCalloutDismissed]
  );

  return (
    showCallout && (
      <>
        <EuiCallOut
          announceOnMount={false}
          color="danger"
          data-test-subj={NO_INTEGRATION_CALLOUT_TEST_ID}
          iconType="warning"
          title={NO_API_INTEGRATION_KEY_CALLOUT_TITLE}
        >
          <p>{NO_API_INTEGRATION_KEY_CALLOUT_MSG}</p>
          <EuiButton
            color="danger"
            data-test-subj={NO_INTEGRATION_CALLOUT_DISMISS_BUTTON_TEST_ID}
            onClick={dismissCallOut}
          >
            {DISMISS_CALLOUT}
          </EuiButton>
        </EuiCallOut>
        <EuiSpacer size="l" />
      </>
    )
  );
});

NoApiIntegrationKeyCallOut.displayName = 'NoApiIntegrationKeyCallOut';
