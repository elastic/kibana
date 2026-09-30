/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { i18n } from '@kbn/i18n';
import { HostAutoDetectPage } from './host_auto_detect_page';

export const HostLinuxAutoDetectPage: React.FC = () => (
  <HostAutoDetectPage
    os="linux"
    routePath="/host/linux"
    breadcrumbLabel={i18n.translate('xpack.observability_onboarding.host.breadcrumbs.linux', {
      defaultMessage: 'Linux',
    })}
    title={i18n.translate('xpack.observability_onboarding.host.linux.title', {
      defaultMessage: 'Set up Linux',
    })}
    subtitle={i18n.translate('xpack.observability_onboarding.host.linux.subtitle', {
      defaultMessage: 'Collect logs and metrics from your Linux host.',
    })}
    logo="linux"
  />
);
