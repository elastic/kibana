/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * ATT&CK v18.1 -> v19.1 drift, derived from MITRE's own `revoked-by` STIX
 * relationships plus a name diff of the two releases.
 *
 * This exists because the managed index's whole purpose is grounding: a model
 * trained before v19 "knows" the retired identifiers and the old tactic names,
 * and will reach for them. These fixtures measure whether retrieval can carry a
 * stale recollection to the entity that superseded it, which is the failure the
 * index is supposed to prevent.
 */

export interface RetiredEntity {
  /** Identifier a pre-v19 model is likely to emit. */
  staleId: string;
  /** Name that identifier carried in v18.1. */
  staleName: string;
  /** Identifier MITRE revoked it in favour of. */
  successorId: string;
}

export const retiredEntities: RetiredEntity[] = [
  { staleId: 'T1070.001', staleName: 'Clear Windows Event Logs', successorId: 'T1685.005' },
  { staleId: 'T1070.002', staleName: 'Clear Linux or Mac System Logs', successorId: 'T1685.006' },
  { staleId: 'T1562', staleName: 'Impair Defenses', successorId: 'T1685' },
  { staleId: 'T1562.001', staleName: 'Disable or Modify Tools', successorId: 'T1685' },
  { staleId: 'T1562.002', staleName: 'Disable Windows Event Logging', successorId: 'T1685.001' },
  { staleId: 'T1562.003', staleName: 'Impair Command History Logging', successorId: 'T1690' },
  { staleId: 'T1562.004', staleName: 'Disable or Modify System Firewall', successorId: 'T1686' },
  { staleId: 'T1562.006', staleName: 'Indicator Blocking', successorId: 'T1685' },
  { staleId: 'T1562.007', staleName: 'Disable or Modify Cloud Firewall', successorId: 'T1686.001' },
  { staleId: 'T1562.008', staleName: 'Disable or Modify Cloud Logs', successorId: 'T1685.002' },
  { staleId: 'T1562.009', staleName: 'Safe Mode Boot', successorId: 'T1688' },
  { staleId: 'T1562.010', staleName: 'Downgrade Attack', successorId: 'T1689' },
  { staleId: 'T1562.011', staleName: 'Spoof Security Alerting', successorId: 'T1685.003' },
  {
    staleId: 'T1562.012',
    staleName: 'Disable or Modify Linux Audit System',
    successorId: 'T1685.004',
  },
  {
    staleId: 'T1562.013',
    staleName: 'Disable or Modify Network Device Firewall',
    successorId: 'T1686.002',
  },
  { staleId: 'T1656', staleName: 'Impersonation', successorId: 'T1684.001' },
  { staleId: 'T1672', staleName: 'Email Spoofing', successorId: 'T1684.002' },
];

export interface RenamedEntity {
  id: string;
  staleName: string;
  currentName: string;
}

export const renamedEntities: RenamedEntity[] = [
  {
    id: 'T1211',
    staleName: 'Exploitation for Defense Evasion',
    currentName: 'Exploitation for Stealth',
  },
  {
    id: 'T1222.001',
    staleName: 'Windows File and Directory Permissions Modification',
    currentName: 'Windows Permissions',
  },
  {
    id: 'T1222.002',
    staleName: 'Linux and Mac File and Directory Permissions Modification',
    currentName: 'Linux and Mac Permissions',
  },
  {
    id: 'T1557.001',
    staleName: 'LLMNR/NBT-NS Poisoning and SMB Relay',
    currentName: 'Name Resolution Poisoning and SMB Relay',
  },
  { id: 'TA0005', staleName: 'Defense Evasion', currentName: 'Stealth' },
];

/** Identifiers that did not exist at all before v19.1. */
export const entitiesAddedInV19: string[] = [
  'T1027.018', // Invisible Unicode
  'T1682', // Query Public AI Services
  'T1683', // Generate Content
  'T1683.001', // Written Content
  'T1683.002', // Audio-Visual Content
  'T1684', // Social Engineering
  'T1684.001', // Impersonation
  'T1684.002', // Email Spoofing
  'T1685', // Disable or Modify Tools
  'T1685.001', // Disable or Modify Windows Event Log
  'T1685.002', // Disable or Modify Cloud Log
  'T1685.003', // Modify or Spoof Tool UI
  'T1685.004', // Disable or Modify Linux Audit System Log
  'T1685.005', // Clear Windows Event Logs
  'T1685.006', // Clear Linux or Mac System Logs
  'T1686', // Disable or Modify System Firewall
  'T1686.001', // Cloud Firewall
  'T1686.002', // Network Device Firewall
  'T1686.003', // Windows Host Firewall
  'T1687', // Exploitation for Defense Impairment
  'T1688', // Safe Mode Boot
  'T1689', // Downgrade Attack
  'T1690', // Prevent Command History Logging
  'TA0112', // Defense Impairment
];
