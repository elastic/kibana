/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  buildChainWorld,
  withNetworkDestination,
  withoutProcessParent,
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

/**
 * The benign mimic: the same chain on an SCCM distribution point, run by the
 * Configuration Manager client, talking only to Microsoft management services.
 */
export const fpWorld = (runMarker: string): FpTpWorld =>
  withManagementDestinations(
    withProcessParent(
      tpWorld(runMarker, 'sccm_distribution_point'),
      'powershell.exe',
      CCMEXEC_PARENT
    )
  );
