/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { getAd2ScenarioAlertIds } from '@kbn/evals-suite-attack-discovery-agent-builder';
import { FP_TP_BASE_TIME, FP_TP_TWIN_SEED_LABEL } from '../../world';
import {
  ENCODED_POWERSHELL_ATTACK_ID,
  ENCODED_POWERSHELL_HOST,
  ENCODED_POWERSHELL_SCENARIO_KEY,
  ENCODED_POWERSHELL_USER,
} from './ids';

/**
 * Authored Attack Discovery. Used as-is in both twins — the world around it
 * is what changes the gold verdict, not the discovery text.
 */
export const buildEncodedPowershellAttack = (
  runMarker: string = FP_TP_TWIN_SEED_LABEL
): Record<string, unknown> => ({
  '@timestamp': FP_TP_BASE_TIME.toISOString().replace(/\.\d{3}Z$/, '.000Z'),
  labels: {
    ad_fp_tp_twin: 'encoded-powershell',
    ad_portable_seed: runMarker,
  },
  'kibana.space_ids': ['default'],
  'kibana.alert.uuid': ENCODED_POWERSHELL_ATTACK_ID,
  'kibana.alert.attack_discovery.alert_ids': getAd2ScenarioAlertIds(
    ENCODED_POWERSHELL_SCENARIO_KEY,
    'clean',
    runMarker
  ),
  'kibana.alert.attack_discovery.title':
    'Encoded PowerShell download cradle with C2 and lateral movement',
  'kibana.alert.attack_discovery.entity_summary_markdown': `{{ host.name ${ENCODED_POWERSHELL_HOST} }} / {{ user.name ${ENCODED_POWERSHELL_USER} }}`,
  'kibana.alert.attack_discovery.summary_markdown':
    'Office spawned hidden encoded PowerShell, which reached a malicious C2 domain, wrote a Run key, and copied a payload to an administrative SMB share.',
  'kibana.alert.attack_discovery.details_markdown': `On {{ host.name ${ENCODED_POWERSHELL_HOST} }}, {{ user.name ${ENCODED_POWERSHELL_USER} }} opened Word, which spawned powershell.exe with -EncodedCommand. The same PowerShell process connected to malicious-c2.example.com, created HKCU Run persistence for update.ps1, then copied payload.exe to \\\\srv-files-02\\ADMIN$. This is a multi-stage intrusion spanning execution, command-and-control, persistence, and lateral movement.`,
  'kibana.alert.attack_discovery.mitre_attack_tactics': [
    'Execution',
    'Command and Control',
    'Persistence',
    'Lateral Movement',
  ],
});
