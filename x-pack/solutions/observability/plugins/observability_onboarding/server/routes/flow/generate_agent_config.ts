/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { dump } from 'js-yaml';
import type { Output } from '@kbn/fleet-plugin/common/types';
import { transformOutputToFullPolicyOutput } from '@kbn/fleet-plugin/server/services/output_client';
import type { InstalledIntegration } from '../types';
import { makeTar, type Entry } from './make_tar';

export function generateAgentConfigTar(
  output: Output,
  installedIntegrations: InstalledIntegration[],
  writeToLogsStreams: boolean = false
) {
  const now = new Date();
  const outputConfig = transformOutputToFullPolicyOutput(output, undefined, true);
  if (writeToLogsStreams) {
    outputConfig._write_to_logs_streams = true;
  }

  return makeTar([
    {
      type: 'File',
      path: 'elastic-agent.yml',
      mode: 0o644,
      mtime: now,
      data: dump({
        outputs: {
          default: outputConfig,
        },
      }),
    },
    {
      type: 'Directory',
      path: 'inputs.d/',
      mode: 0o755,
      mtime: now,
    },
    ...installedIntegrations.map<Entry>((integration) => ({
      type: 'File',
      path: `inputs.d/${integration.pkgName}.yml`,
      mode: 0o644,
      mtime: now,
      data: integration.config,
    })),
  ]);
}
