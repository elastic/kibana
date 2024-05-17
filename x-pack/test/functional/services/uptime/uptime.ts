/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { FtrProviderContext } from '../../ftr_provider_context';

import { UptimeAlertsProvider } from './alerts';
import { UptimeCertProvider } from './certificates';
import { UptimeCommonProvider } from './common';
import { UptimeMLAnomalyProvider } from './ml_anomaly';
import { UptimeMonitorProvider } from './monitor';
import { UptimeNavigationProvider } from './navigation';
import { UptimeOverviewProvider } from './overview';
import { UptimeSettingsProvider } from './settings';

export function UptimeProvider(context: FtrProviderContext) {
  const common = UptimeCommonProvider(context);
  const settings = UptimeSettingsProvider(context);
  const monitor = UptimeMonitorProvider(context);
  const navigation = UptimeNavigationProvider(context);
  const alerts = UptimeAlertsProvider(context);
  const ml = UptimeMLAnomalyProvider(context);
  const cert = UptimeCertProvider(context);
  const overview = UptimeOverviewProvider(context);

  return {
    common,
    settings,
    monitor,
    navigation,
    alerts,
    ml,
    cert,
    overview,
  };
}
