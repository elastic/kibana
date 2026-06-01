/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { i18n } from '@kbn/i18n';
import { HostOtelPage } from './host_otel_page';

export const HostWindowsOtelPage: React.FC = () => (
  <HostOtelPage
    os="windows"
    routePath="/host/windows"
    breadcrumbLabel={i18n.translate('xpack.observability_onboarding.host.breadcrumbs.windows', {
      defaultMessage: 'Windows',
    })}
    title={i18n.translate('xpack.observability_onboarding.host.windows.title', {
      defaultMessage: 'Set up Windows',
    })}
    subtitle={i18n.translate('xpack.observability_onboarding.host.windows.subtitle', {
      defaultMessage: 'Collect logs and metrics from your Windows host.',
    })}
    logo="windows"
    installStepTitle={i18n.translate(
      'xpack.observability_onboarding.host.windows.installStepTitle',
      { defaultMessage: 'Install the collector' }
    )}
  />
);
