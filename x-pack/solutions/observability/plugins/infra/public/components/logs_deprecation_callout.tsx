/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiCallOut, useEuiTheme } from '@elastic/eui';
import React from 'react';
import { i18n } from '@kbn/i18n';
import { EuiButton } from '@elastic/eui';
import { getRouterLinkProps } from '@kbn/router-utils';
import useLocalStorage from 'react-use/lib/useLocalStorage';
import { css } from '@emotion/react';
import type { LocatorPublic } from '@kbn/share-plugin/common';
import type { DiscoverAppLocatorParams } from '@kbn/discover-plugin/common';
import { DISCOVER_APP_LOCATOR } from '@kbn/discover-plugin/common';
import { useKibanaContextForPlugin } from '../hooks/use_kibana';

const pageConfigurations = {
  stream: {
    dismissalStorageKey: 'log_stream_deprecation_callout_dismissed',
    message: i18n.translate('xpack.infra.logsDeprecationCallout.stream.exploreWithDiscover', {
      defaultMessage:
        'Logs Stream and Logs Explorer are set to be deprecated. Switch to Discover and enable the new Observability solution for an improved logs experience.',
    }),
  },
  settings: {
    dismissalStorageKey: 'log_settings_deprecation_callout_dismissed',
    message: i18n.translate('xpack.infra.logsDeprecationCallout.settings.exploreWithDiscover', {
      defaultMessage:
        'These settings only apply to the legacy Logs Stream app. Switch to Discover and enable the new Observability solution for an improved logs experience.',
    }),
  },
};

interface LogsDeprecationCalloutProps {
  page: keyof typeof pageConfigurations;
}

export const LogsDeprecationCallout = ({ page }: LogsDeprecationCalloutProps) => {
  const { euiTheme } = useEuiTheme();
  const {
    services: {
      share,
      application: {
        capabilities: { discover_v2: discover, fleet },
      },
    },
  } = useKibanaContextForPlugin();

  const { dismissalStorageKey, message } = pageConfigurations[page];

  const [isDismissed, setDismissed] = useLocalStorage(dismissalStorageKey, false);

  const discoverLocator = share.url.locators.get<DiscoverAppLocatorParams>(DISCOVER_APP_LOCATOR);

  if (isDismissed || !(discoverLocator && discover?.show && fleet?.read)) {
    return null;
  }

  return (
    <EuiCallOut
      title={i18n.translate('xpack.infra.logsDeprecationCallout.euiCallOut.discoverANewLogLabel', {
        defaultMessage: "There's a new, better way to explore your logs!",
      })}
      color="warning"
      iconType="iInCircle"
      heading="h2"
      onDismiss={() => setDismissed(true)}
      css={css`
        margin-bottom: ${euiTheme.size.l};
      `}
    >
      <p>{message}</p>
      <EuiButton
        fill
        data-test-subj="infraLogsDeprecationCalloutGoToDiscoverButton"
        color="warning"
        {...getDiscoverLinkProps(discoverLocator)}
      >
        {i18n.translate('xpack.infra.logsDeprecationCallout.goToDiscoverButtonLabel', {
          defaultMessage: 'Go to Discover',
        })}
      </EuiButton>
    </EuiCallOut>
  );
};

const getDiscoverLinkProps = (locator: LocatorPublic<DiscoverAppLocatorParams>) => {
  return getRouterLinkProps({
    href: locator.getRedirectUrl({}),
    onClick: () => locator.navigate({}),
  });
};
