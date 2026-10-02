/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { mkdir } from 'fs/promises';
import path from 'path';
import { getHostVmClient } from '../../../../scripts/endpoint/common/vm_services';

/**
 * Writes an Elastic Agent diagnostics archive under `target/agent_diagnostics`
 * so CI can collect it with the job artifacts. Same capture the Cypress
 * `captureHostVmAgentDiagnostics` task performed after a failed real-host spec.
 */
export const captureHostVmAgentDiagnostics = async (
  hostname: string,
  fileNamePrefix = ''
): Promise<string> => {
  const vmClient = getHostVmClient(hostname);
  const fileName = `elastic-agent-diagnostics-${hostname}-${new Date()
    .toISOString()
    .replace(/:/g, '.')}.zip`;
  const vmDiagnosticsFile = `/tmp/${fileName}`;
  const safePrefix = fileNamePrefix.replace(/[><:"/\\|?*'`{} ]/g, '_');
  const localDiagnosticsFile = path.join(
    'target',
    'agent_diagnostics',
    `${safePrefix ? `${safePrefix}-` : ''}${fileName}`
  );

  await mkdir(path.dirname(localDiagnosticsFile), { recursive: true });
  await vmClient.exec(
    `sudo /opt/Elastic/Agent/elastic-agent diagnostics --file ${vmDiagnosticsFile}`
  );
  const response = await vmClient.download(vmDiagnosticsFile, localDiagnosticsFile);

  return response.filePath;
};
