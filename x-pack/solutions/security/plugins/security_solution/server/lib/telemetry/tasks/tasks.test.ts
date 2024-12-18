/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { createTelemetryConfigurationTaskConfig } from './configuration';
import { createTelemetryDetectionRuleListsTaskConfig } from './detection_rule';
import { createTelemetryDiagnosticsTaskConfig } from './diagnostic';
import { createTelemetryEndpointTaskConfig } from './endpoint';
import { createTelemetryFilterListArtifactTaskConfig } from './filterlists';
import { createTelemetryTimelineTaskConfig } from './timelines';
import { createTelemetrySecurityListTaskConfig } from './security_lists';
import { createTelemetryPrebuiltRuleAlertsTaskConfig } from './prebuilt_rule_alerts';

describe('security telemetry - ', () => {
  const stubBatchNumber = 0;

  test('configuration artifact task interval is set to 1h', async () => {
    const taskConfig = createTelemetryConfigurationTaskConfig();
    expect(taskConfig.interval).toEqual('1h');
  });

  test('detection rule lists task interval is set to 24h', async () => {
    const taskConfig = createTelemetryDetectionRuleListsTaskConfig(stubBatchNumber);
    expect(taskConfig.interval).toEqual('24h');
  });

  test('diagnostic alerts task interval is set to 5m', async () => {
    const taskConfig = createTelemetryDiagnosticsTaskConfig();
    expect(taskConfig.interval).toEqual('5m');
  });

  test('endpoint metadata task interval is set to 24h', async () => {
    const taskConfig = createTelemetryEndpointTaskConfig(stubBatchNumber);
    expect(taskConfig.interval).toEqual('24h');
  });

  test('filterlists task is set to 45m', async () => {
    const taskConfig = createTelemetryFilterListArtifactTaskConfig();
    expect(taskConfig.interval).toEqual('45m');
  });

  test('prebuilt rule alerts (detection rules) task are set to 1h', async () => {
    const taskConfig = createTelemetryPrebuiltRuleAlertsTaskConfig(stubBatchNumber);
    expect(taskConfig.interval).toEqual('1h');
  });

  test('security lists task is set to 24h', async () => {
    const taskConfig = createTelemetrySecurityListTaskConfig(stubBatchNumber);
    expect(taskConfig.interval).toEqual('24h');
  });

  test('timelines task is set to 1h', async () => {
    const taskConfig = createTelemetryTimelineTaskConfig();
    expect(taskConfig.interval).toEqual('1h');
  });
});
