/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { FtrProviderContext } from '../../ftr_provider_context';

import { UptimeSettingsProvider } from './settings';
import { UptimeCommonProvider } from './common';
import { UptimeMonitorProvider } from './monitor';
import { UptimeNavigationProvider } from './navigation';
import { UptimeAlertsProvider } from './alerts';
import { UptimeMLAnomalyProvider } from './ml_anomaly';
import { UptimeCertProvider } from './certificates';
import { UptimeOverviewProvider } from './overview';

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
