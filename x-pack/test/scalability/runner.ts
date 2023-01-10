/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { withProcRunner } from '@kbn/dev-proc-runner';
// @ts-expect-error we have to check types with "allowJs: false" for now, causing this import to fail
import { kibanaPackageJson } from '@kbn/repo-info';
import path from 'path';
import fs from 'fs';
import { ToolingLog } from '@kbn/tooling-log';
import { FtrProviderContext } from './ftr_provider_context';
import { EventsShipper } from './events_shipper';
import { getCapacityMetrics } from './report_parser';
import { ScalabilityJourney, MetricEvent } from './types';

const telemetryChannel = 'scalability-metrics';

async function sendReportMetricsToTelemetry(
  gatlingProjectRootPath: string,
  scalabilityJsonPath: string,
  log: ToolingLog
) {
  const reportRootPath = path.resolve(gatlingProjectRootPath, 'target', 'gatling');
  const fileName = path.basename(scalabilityJsonPath, path.extname(scalabilityJsonPath));
  const journeyReportDir = fs.readdirSync(reportRootPath).filter((f) => f.startsWith(fileName));
  const lastReportPath = journeyReportDir.pop();
  if (lastReportPath) {
    const journeyHtmlReportPath = path.resolve(reportRootPath, lastReportPath, 'index.html');

    const journey: ScalabilityJourney = JSON.parse(fs.readFileSync(scalabilityJsonPath, 'utf8'));
    const metrics = getCapacityMetrics(journeyHtmlReportPath, journey.scalabilitySetup, log);
    const events: MetricEvent[] = [
      {
        ...metrics,
        eventType: 'scalability_metric',
        eventName: 'capacity_test_summary',
        journeyName: journey.journeyName,
        kibanaVersion: kibanaPackageJson.version,
        branch: process.env.BUILDKITE_BRANCH,
        ciBuildId: process.env.BUILDKITE_BUILD_ID,
        ciBuildJobId: process.env.BUILDKITE_JOB_ID,
        ciBuildNumber: Number(process.env.BUILDKITE_BUILD_NUMBER) || 0,
        ciBuildName: process.env.BUILDKITE_PIPELINE_SLUG,
        gitRev: process.env.BUILDKITE_COMMIT,
      },
    ];
    log.info(`Sending event: ${JSON.stringify(events)}`);
    const shipper = new EventsShipper(
      `https://telemetry-staging.elastic.co/v3/send/${telemetryChannel}?debug=true`,
      'scalability-test',
      '1',
      log
    );

    await shipper.send(events);
  }
}

/**
 * ScalabilityTestRunner is used to run load simulation against local Kibana instance
 * scalabilityJsonPath defines path to the file, parsed and executed by Gatling runner
 * gatlingProjectRootPath defines root path to the kibana-load-testing repo
 */
export async function ScalabilityTestRunner(
  { getService }: FtrProviderContext,
  scalabilityJsonPath: string,
  gatlingProjectRootPath: string
) {
  const log = getService('log');
  const gatlingReportBaseDir = path.parse(scalabilityJsonPath).name;

  log.info(`Running scalability test with json file: '${scalabilityJsonPath}'`);

  await withProcRunner(log, async (procs) => {
    await procs.run('gatling: test', {
      cmd: 'mvn',
      args: [
        'gatling:test',
        '-q',
        `-Dgatling.core.outputDirectoryBaseName=${gatlingReportBaseDir}`,
        '-Dgatling.simulationClass=org.kibanaLoadTest.simulation.generic.GenericJourney',
        `-DjourneyPath=${scalabilityJsonPath}`,
      ],
      cwd: gatlingProjectRootPath,
      env: {
        ...process.env,
      },
      wait: true,
    });
  });

  await sendReportMetricsToTelemetry(gatlingProjectRootPath, scalabilityJsonPath, log);
}
