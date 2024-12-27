/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React, { useState, useCallback } from 'react';
import { EuiButtonEmpty, EuiFlexGroup, EuiFlyout, EuiHeaderLinks } from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n-react';
import {
  KibanaWiredConnectionDetailsProvider,
  ConnectionDetailsFlyoutContent,
} from '@kbn/cloud/connection_details';

import { useUsageTracker } from '../hooks/use_usage_tracker';

export const EndpointsHeaderAction = () => {
  const usageTracker = useUsageTracker();
  const [open, setOpen] = useState<boolean>(false);
  const onClickEndpointsButton = useCallback(() => {
    usageTracker.click('endpoints_and_api_keys');
    setOpen(true);
  }, [usageTracker]);

  return (
    <>
      <EuiHeaderLinks>
        <EuiFlexGroup alignItems="center" gutterSize="s">
          <EuiButtonEmpty
            iconType="endpoint"
            size="s"
            onClick={onClickEndpointsButton}
            data-test-subj="searchHomepageEndpointsHeaderActionEndpointsApiKeysButton"
            data-telemetry-id="searchHomepageEndpointsHeaderActionEndpointsApiKeysButton"
          >
            <FormattedMessage
              id="xpack.searchHomepage.header.endpointsButtonLabel"
              defaultMessage="Endpoints & API keys"
            />
          </EuiButtonEmpty>
        </EuiFlexGroup>
      </EuiHeaderLinks>
      {open && (
        <EuiFlyout onClose={() => setOpen(false)} size="s">
          <KibanaWiredConnectionDetailsProvider>
            <ConnectionDetailsFlyoutContent />
          </KibanaWiredConnectionDetailsProvider>
        </EuiFlyout>
      )}
    </>
  );
};
