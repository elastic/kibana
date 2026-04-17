/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import React, { useCallback } from 'react';
import { useParams } from 'react-router-dom';
import { useLocation } from 'react-router-dom-v5-compat';
import { useEuiTheme } from '@elastic/eui';
import { useKibana } from '@kbn/kibana-react-plugin/public';
import { INGEST_HUB_APP_ID } from '@kbn/deeplinks-observability';
import type { EuiIconType } from '@elastic/eui/src/components/icon/icon';
import type { ObservabilityOnboardingAppServices } from '../..';
import type { SupportedLogo } from '../shared/logo_icon';
import {
  UnifiedHostPanel,
  type HostCollector,
  type HostPlatform,
} from '../quickstart_flows/unified_host/unified_host_panel';
import { PageTemplate } from './template';
import { CustomHeader } from '../header';
import { useFlowBreadcrumb } from '../shared/use_flow_breadcrumbs';

interface PlatformMeta {
  breadcrumb: string;
  headline: string;
  caption: string;
  logo?: SupportedLogo;
  euiIconType?: EuiIconType;
}

function getPlatformMeta(platform: HostPlatform, isDarkMode: boolean): PlatformMeta {
  switch (platform) {
    case 'linux':
      return {
        breadcrumb: i18n.translate(
          'xpack.observability_onboarding.unifiedHostPage.breadcrumbs.linux',
          { defaultMessage: 'Linux' }
        ),
        headline: i18n.translate('xpack.observability_onboarding.unifiedHostPage.linux.headline', {
          defaultMessage: 'Monitor your Linux host',
        }),
        caption: i18n.translate('xpack.observability_onboarding.unifiedHostPage.linux.caption', {
          defaultMessage:
            'Set up Linux host monitoring using Elastic Agent or the Elastic Distribution for OpenTelemetry Collector',
        }),
        logo: 'linux',
      };
    case 'mac':
      return {
        breadcrumb: i18n.translate(
          'xpack.observability_onboarding.unifiedHostPage.breadcrumbs.mac',
          { defaultMessage: 'macOS' }
        ),
        headline: i18n.translate('xpack.observability_onboarding.unifiedHostPage.mac.headline', {
          defaultMessage: 'Monitor your macOS host',
        }),
        caption: i18n.translate('xpack.observability_onboarding.unifiedHostPage.mac.caption', {
          defaultMessage:
            'Set up macOS host monitoring using Elastic Agent or the Elastic Distribution for OpenTelemetry Collector',
        }),
        logo: isDarkMode ? 'apple_white' : 'apple_black',
      };
    case 'windows':
      return {
        breadcrumb: i18n.translate(
          'xpack.observability_onboarding.unifiedHostPage.breadcrumbs.windows',
          { defaultMessage: 'Windows' }
        ),
        headline: i18n.translate(
          'xpack.observability_onboarding.unifiedHostPage.windows.headline',
          { defaultMessage: 'Monitor your Windows host' }
        ),
        caption: i18n.translate('xpack.observability_onboarding.unifiedHostPage.windows.caption', {
          defaultMessage:
            'Set up Windows host monitoring using the Elastic Distribution for OpenTelemetry Collector',
        }),
        euiIconType: 'logoWindows',
      };
  }
}

function parseCollector(value: string | null): HostCollector | undefined {
  return value === 'agent' || value === 'otel' ? value : undefined;
}

export const UnifiedHostPage = () => {
  const { platform } = useParams<{ platform: HostPlatform }>();
  const { search } = useLocation();
  const defaultCollector = parseCollector(new URLSearchParams(search).get('collector'));
  const { colorMode } = useEuiTheme();
  const meta = getPlatformMeta(platform, colorMode === 'DARK');

  const {
    services: { application },
  } = useKibana<ObservabilityOnboardingAppServices>();

  useFlowBreadcrumb({
    text: meta.breadcrumb,
  });

  const onBackToIngestHub = useCallback(() => {
    application?.navigateToApp(INGEST_HUB_APP_ID);
  }, [application]);

  return (
    <PageTemplate
      customHeader={
        <CustomHeader
          logo={meta.logo}
          euiIconType={meta.euiIconType}
          headlineCopy={meta.headline}
          captionCopy={meta.caption}
          onBack={onBackToIngestHub}
        />
      }
    >
      <UnifiedHostPanel platform={platform} defaultCollector={defaultCollector} />
    </PageTemplate>
  );
};
