/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  buildChainWorld,
  getChainIds,
  withCommandLine,
  withFilePath,
  withNetworkDestination,
  withoutProcessParent,
  withProcessExecutable,
  withProcessParent,
  type FpTpChainParentProcess,
  type FpTpEntityRoleKey,
  type FpTpWorld,
} from '../../world';
import { MIMICRAT_C2_DOMAIN, MIMICRAT_CHAIN, MIMICRAT_STAGE2_DOMAIN } from './chain';

export const CCMEXEC_PARENT: FpTpChainParentProcess = {
  name: 'CcmExec.exe',
  pid: 2188,
  executable: 'C:\\Windows\\CCM\\CcmExec.exe',
  code_signature: { status: 'trusted', subject_name: 'Microsoft Windows' },
};

export const INTUNE_AGENT_PARENT: FpTpChainParentProcess = {
  name: 'AgentExecutor.exe',
  pid: 3376,
  executable: 'C:\\Program Files (x86)\\Microsoft Intune Management Extension\\AgentExecutor.exe',
  code_signature: { status: 'trusted', subject_name: 'Microsoft Corporation' },
};

export const tpWorld = (
  runMarker: string,
  role: FpTpEntityRoleKey = 'employee_workstation'
): FpTpWorld => buildChainWorld(MIMICRAT_CHAIN, runMarker, { role });

/**
 * Removes the parent of both chain processes. With only PowerShell's parent gone, the
 * analysis judges `zbuild.exe`'s parent (`powershell.exe`) as a user shell instead.
 */
export const withoutChainParents = (world: FpTpWorld): FpTpWorld =>
  withoutProcessParent(withoutProcessParent(world, 'powershell.exe'), 'zbuild.exe');

/** Points the stage-2 download and the C2 traffic at Microsoft management services. */
export const withManagementDestinations = (world: FpTpWorld): FpTpWorld =>
  withNetworkDestination(
    withNetworkDestination(world, MIMICRAT_STAGE2_DOMAIN, {
      domain: 'manage.microsoft.com',
      ip: '20.190.128.10',
      port: 443,
    }),
    MIMICRAT_C2_DOMAIN,
    { domain: 'sccm-dp-02.corp.local', ip: '10.50.10.20', port: 443 }
  );

/** The raw events that carry the PowerShell one-liner, and with it the stage-2 domain. */
const CRADLE_EVENT_KEYS = ['clickfix-powershell', 'stage2-download', 'loader-drop'] as const;

/** Rewrites the one-liner on every raw event of the chain's PowerShell process. */
export const withCradle = (world: FpTpWorld, runMarker: string, commandLine: string): FpTpWorld => {
  const { eventId } = getChainIds(MIMICRAT_CHAIN, runMarker);
  return CRADLE_EVENT_KEYS.reduce(
    (acc, key) => withCommandLine(acc, eventId(key), commandLine),
    world
  );
};

const CCM_SCRIPT_DIR = 'C:\\Windows\\CCM\\SystemTemp';

const CCM_PACKAGE_PATH = 'C:\\Windows\\ccmcache\\3f\\zbuild.exe';

/** The raw events of `zbuild.exe`, each carrying its command line. */
const LOADER_EVENT_KEYS = ['loader-start', 'c2-checkin', 'c2-exfil'] as const;

/**
 * Replaces the replay's malicious raw-event content with Configuration Manager activity:
 * compliance scripts instead of the cradle and the AMSI patch, and a cached package
 * instead of the ProgramData loader. The alerts and the discovery keep their claims.
 */
export const withBenignActivity = (world: FpTpWorld, runMarker: string): FpTpWorld => {
  const { eventId } = getChainIds(MIMICRAT_CHAIN, runMarker);
  const scripted = withCommandLine(
    withCradle(
      world,
      runMarker,
      `powershell.exe -NoProfile -ExecutionPolicy Bypass -File ${CCM_SCRIPT_DIR}\\a3f1c2d4.ps1`
    ),
    eventId('amsi-bypass'),
    `powershell.exe -NoProfile -ExecutionPolicy Bypass -File ${CCM_SCRIPT_DIR}\\b7e9d0f2.ps1`
  );
  return LOADER_EVENT_KEYS.reduce(
    (acc, key) => withCommandLine(acc, eventId(key), CCM_PACKAGE_PATH),
    withProcessExecutable(
      withFilePath(scripted, eventId('loader-drop'), CCM_PACKAGE_PATH),
      'zbuild.exe',
      CCM_PACKAGE_PATH
    )
  );
};

/**
 * The benign mimic: the same alerts and discovery on an SCCM distribution point, where
 * the Configuration Manager client runs compliance scripts and a cached package that
 * talk only to Microsoft management services.
 */
export const fpWorld = (runMarker: string): FpTpWorld =>
  withManagementDestinations(
    withProcessParent(
      withBenignActivity(tpWorld(runMarker, 'sccm_distribution_point'), runMarker),
      'powershell.exe',
      CCMEXEC_PARENT
    )
  );
