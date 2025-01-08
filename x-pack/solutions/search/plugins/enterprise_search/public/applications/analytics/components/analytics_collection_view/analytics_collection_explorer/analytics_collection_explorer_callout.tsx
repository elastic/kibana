/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';

import { useValues } from 'kea';

import { EuiButton, EuiCallOut } from '@elastic/eui';

import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';
import { RedirectAppLinks } from '@kbn/shared-ux-link-redirect-app';

import { KibanaLogic } from '../../../../shared/kibana';
import { useDiscoverLink } from '../use_discover_link';

export const AnalyticsCollectionExplorerCallout: React.FC = () => {
  const { application } = useValues(KibanaLogic);
  const discoverLink = useDiscoverLink();

  return discoverLink ? (
    <EuiCallOut
      title={i18n.translate(
        'xpack.enterpriseSearch.analytics.collectionsView.explorer.callout.title',
        { defaultMessage: 'Need a deeper analysis?' }
      )}
      iconType="inspect"
    >
      <p>
        <FormattedMessage
          id="xpack.enterpriseSearch.analytics.collectionsView.explorer.callout.description"
          defaultMessage="Review your event logs in Discover to get more insights about your application metrics."
        />
      </p>

      <RedirectAppLinks coreStart={{ application }}>
        <EuiButton
          fill
          href={discoverLink}
          data-telemetry-id="entSearch-analytics-explorer-callout-exploreLink"
        >
          <FormattedMessage
            id="xpack.enterpriseSearch.analytics.collectionsView.explorer.callout.button"
            defaultMessage="Explore"
          />
        </EuiButton>
      </RedirectAppLinks>
    </EuiCallOut>
  ) : null;
};
