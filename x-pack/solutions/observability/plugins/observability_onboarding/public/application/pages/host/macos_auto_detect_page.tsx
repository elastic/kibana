/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { i18n } from '@kbn/i18n';
import { useEuiTheme } from '@elastic/eui';
import { HostAutoDetectPage } from './host_auto_detect_page';

export const HostMacosAutoDetectPage: React.FC = () => {
  const { colorMode } = useEuiTheme();
  return (
    <HostAutoDetectPage
      os="mac"
      routePath="/host/macos"
      breadcrumbLabel={i18n.translate('xpack.observability_onboarding.host.breadcrumbs.macos', {
        defaultMessage: 'macOS',
      })}
      title={i18n.translate('xpack.observability_onboarding.host.macos.title', {
        defaultMessage: 'Set up macOS',
      })}
      subtitle={i18n.translate('xpack.observability_onboarding.host.macos.subtitle', {
        defaultMessage: 'Collect logs and metrics from your macOS host.',
      })}
      logo={colorMode === 'DARK' ? 'apple_white' : 'apple_black'}
    />
  );
};
