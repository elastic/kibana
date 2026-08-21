/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Client } from '@elastic/elasticsearch';
import type { ToolingLog } from '@kbn/tooling-log';
import { createHash } from 'node:crypto';

/**
 * Seeds `.kibana-threat-reports*` with richly-populated threat-intelligence
 * report documents that exercise the full Dark Watch surface:
 *
 *   - IOC extraction (hash, IP, domain, URL, email, CVE)
 *   - MITRE ATT&CK technique mapping
 *   - Diamond-model vertices (adversary/capability/infrastructure/victim)
 *   - Severity + relevance + rank_score
 *   - Categories + regions (dashboard panels)
 *   - Enrichment gate verdicts
 *   - Hunt feedback (corroborated_rank_score)
 *   - Source attribution + admiralty ratings
 *   - Cross-references that match the seeded endpoint telemetry (so
 *     correlate_threat and hunt_orchestrator find real hits)
 *
 * Reports are crafted to overlap with the forensic kill chain seeded by
 * `forensic_seed_data.ts` / `demo_data.ts`:
 *   - Report 1: APT29 / NOBELIUM — matches the C2 IP 185.220.101.42
 *     and the file hash a3f5c9d1e8b74620...
 *   - Report 2: LockBit 3.0 ransomware — matches the vssadmin + .locked
 *     extension + README_RESTORE.txt pattern on SRV-DC01
 *   - Report 3: CobaltStrike beacon — matches the encoded PowerShell
 *     initial access pattern
 *   - Report 4: A non-overlapping noise report (no telemetry hits) —
 *     demonstrates the "no environment impact" path
 *   - Report 5: CISA KEV vulnerability entry — structured vulnerability fields
 *
 * Run standalone against a deployed or local ES:
 *
 *   node --require ./src/setup_node_env \
 *     x-pack/solutions/security/plugins/security_solution/scripts/endpoint/blackhat_demo/seed_dark_watch_reports.ts \
 *     --node <es-url> --username elastic --password <pw>
 */

import { run } from '@kbn/dev-cli-runner';
import { createEsClient } from '../common/stack_services';

// ── Shared IoC constants (must match forensic_seed_data.ts + demo_data.ts) ───

const SHARED_HASH = 'a3f5c9d1e8b74620fa1c0d5e2b9847361c0ded4488ab2f0e9a7c6b5d4e3f2a10';
const SHARED_C2_IP = '185.220.101.42';
const SHARED_C2_DOMAIN = 'evil-c2.onion.ws';
const SHARED_RUN_KEY = 'HKLM\\Software\\Microsoft\\Windows\\CurrentVersion\\Run\\Updater';

// ── Types ────────────────────────────────────────────────────────────────────

interface ThreatReportDoc {
  '@timestamp': string;
  content_fingerprint: string;
  space_id: string;
  source: {
    type: string;
    name: string;
    url: string;
    adapter_id: string;
    admiralty_rating: string;
    tier: number;
  };
  content: {
    title: string;
    body_text: string;
    language: string;
  };
  severity: {
    level: string;
    score: number;
  };
  rank_score: number;
  corroborated_rank_score: number;
  extracted: {
    iocs: Array<{
      type: string;
      value: string;
      tier: string;
      tier_heuristic: string;
      tier_basis: string;
      severity: string;
      defanged?: string;
    }>;
    ioc_set_hash: string;
    relevance: number;
    detection_actionability: string;
    ttps: {
      tactics: string[];
      techniques: string[];
    };
    behaviors: Array<{
      id: string;
      technique_id: string;
      description: string;
      telemetry_targets: string[];
      confidence: number;
    }>;
    threat_actors: string[];
    target_sectors: string[];
    categories: string[];
    diamond: {
      adversary: { signal: string; summary: string };
      capability: { signal: string; summary: string };
      infrastructure: { signal: string; summary: string };
      victim: { signal: string; summary: string };
      signal_count: number;
      model_id: string;
      extracted_at: string;
      extraction_mode: string;
      suitable: boolean;
    };
    gate: {
      is_intelligence: boolean;
      quality_class: string;
      evidence_tier: string;
      needs_render: boolean;
      has_original_commentary: boolean;
      reason: string;
      assessed_at: string;
    };
    vulnerability?: {
      cve_id: string;
      vendor: string;
      product: string;
      name: string;
      cwes: string[];
      date_added: string;
      due_date: string;
      ransomware_use: string;
    };
  };
  feedback?: {
    ioc_hit_count: number;
    ttp_hit_count: number;
    affected_host_count: number;
    affected_user_count: number;
    last_hunted_at: string;
    last_hunt_status: string;
  };
  attribution?: {
    environment_hits: {
      layer_1_ioc_match: number;
      layer_2_behavioral: number;
      computed_at: string;
      window?: string;
    };
    environment_hits_total: number;
  };
  lineage: {
    ingested_at: string;
    extracted_at: string;
    extraction_method: string;
  };
}

function fingerprint(text: string): string {
  return createHash('sha256').update(text.trim().toLowerCase()).digest('hex');
}

function isoOffsetHours(hours: number): string {
  return new Date(Date.now() + hours * 60 * 60 * 1000).toISOString();
}

// ── Report 1: APT29 / NOBELIUM — C2 + Hash overlap with forensic chain ──────

const report1: ThreatReportDoc = {
  '@timestamp': isoOffsetHours(-2),
  content_fingerprint: fingerprint('apt29-cobalt-strike-c2-infrastructure-2026'),
  space_id: '*',
  source: {
    type: 'rss',
    name: 'Mandiant / Google Cloud Threat Intelligence',
    url: 'https://cloud.google.com/security/blog/threat-intelligence/apt29-c2-2026',
    adapter_id: 'rss:mandiant-research',
    admiralty_rating: 'A',
    tier: 1,
  },
  content: {
    title: 'APT29 (NOBELIUM) Deploys Updated CobaltStrike Beacon via Phishing Campaign',
    body_text: `Mandiant has tracked a resurgence of APT29 (also known as NOBELIUM or Cozy Bear) 
operations targeting government and financial sector organizations in Western Europe and North America. 
The campaign begins with spear-phishing emails containing malicious macro-enabled Office documents. 
When opened, the macro executes an encoded PowerShell command that downloads and executes a second-stage 
payload from a remote server.

The observed beacon communicates with C2 infrastructure at 185.220.101.42:443 using TLS-encrypted 
HTTP beaconing. The second-stage payload is a DLL (SHA-256: a3f5c9d1e8b74620fa1c0d5e2b9847361c0ded4488ab2f0e9a7c6b5d4e3f2a10) 
dropped to C:\\Users\\Public\\update.dll and loaded via rundll32.exe. Persistence is established 
through a Run-key registry entry (HKLM\\Software\\Microsoft\\Windows\\CurrentVersion\\Run\\Updater) 
pointing to C:\\ProgramData\\svc.exe.

The threat actor proceeds to dump LSASS credentials and laterally moves to domain controllers 
via SMB and WMI. Volume shadow copies are deleted prior to file encryption.

MITRE ATT&CK: T1059.001 (PowerShell), T1055 (Process Injection), T1547.001 (Registry Run Keys), 
T1003.001 (LSASS Memory), T1021.002 (SMB/Windows Admin Shares), T1047 (WMI), T1490 (Inhibit System Recovery).`,
    language: 'en',
  },
  severity: { level: 'critical', score: 9.5 },
  rank_score: 0.92,
  corroborated_rank_score: 1.38, // 0.92 * 1.5 boost (6 IOC hits, 4 TTP hits)
  extracted: {
    iocs: [
      {
        type: 'ipv4',
        value: SHARED_C2_IP,
        tier: 'active',
        tier_heuristic: 'active',
        tier_basis: 'resolved_public_ip',
        severity: 'high',
      },
      {
        type: 'domain',
        value: SHARED_C2_DOMAIN,
        tier: 'active',
        tier_heuristic: 'active',
        tier_basis: 'resolved_domain',
        severity: 'high',
      },
      {
        type: 'sha256',
        value: SHARED_HASH,
        tier: 'active',
        tier_heuristic: 'active',
        tier_basis: 'hash_high_entropy',
        severity: 'high',
      },
      {
        type: 'url',
        value: `https://${SHARED_C2_IP}/update.dll`,
        tier: 'active',
        tier_heuristic: 'active',
        tier_basis: 'url_with_ioc_host',
        severity: 'medium',
      },
    ],
    ioc_set_hash: fingerprint(SHARED_C2_IP + SHARED_HASH),
    relevance: 0.97,
    detection_actionability: 'rule_candidate',
    ttps: {
      tactics: ['execution', 'persistence', 'credential-access', 'lateral-movement', 'impact'],
      techniques: ['T1059.001', 'T1055', 'T1547.001', 'T1003.001', 'T1021.002', 'T1047', 'T1490'],
    },
    behaviors: [
      {
        id: 'bh-001',
        technique_id: 'T1059.001',
        description: 'Encoded PowerShell execution from Office macro',
        telemetry_targets: ['process', 'network'],
        confidence: 0.95,
      },
      {
        id: 'bh-002',
        technique_id: 'T1547.001',
        description: 'Registry Run-key persistence pointing to ProgramData payload',
        telemetry_targets: ['registry'],
        confidence: 0.92,
      },
      {
        id: 'bh-003',
        technique_id: 'T1003.001',
        description: 'LSASS credential access via rundll32 loading malicious DLL',
        telemetry_targets: ['process'],
        confidence: 0.88,
      },
      {
        id: 'bh-004',
        technique_id: 'T1490',
        description: 'Shadow copy deletion and mass file encryption',
        telemetry_targets: ['process', 'file'],
        confidence: 0.9,
      },
    ],
    threat_actors: ['APT29', 'NOBELIUM', 'Cozy Bear'],
    target_sectors: ['government', 'finance', 'defense'],
    categories: ['nation-state', 'malware', 'apt'],
    diamond: {
      adversary: {
        signal: 'HIGH',
        summary:
          'APT29 / NOBELIUM — Russian SVR-connected threat actor group with a decade of state-sponsored operations.',
      },
      capability: {
        signal: 'HIGH',
        summary:
          'Custom CobaltStrike beacon variant with encoded PowerShell delivery, LSASS credential theft, and ransomware-style impact behavior.',
      },
      infrastructure: {
        signal: 'HIGH',
        summary:
          'C2 at 185.220.101.42:443 (TLS-encrypted HTTP beaconing); phishing domains registered via privacy services.',
      },
      victim: {
        signal: 'PARTIAL',
        summary:
          'Government agencies and financial institutions in Western Europe and North America.',
      },
      signal_count: 4,
      model_id: 'diamond-extraction',
      extracted_at: isoOffsetHours(-1.5),
      extraction_mode: 'single_call',
      suitable: true,
    },
    gate: {
      is_intelligence: true,
      quality_class: 'intel',
      evidence_tier: 'primary',
      needs_render: false,
      has_original_commentary: true,
      reason:
        'Original Mandiant research with specific IOCs, TTPs, and named threat actor attribution.',
      assessed_at: isoOffsetHours(-1.5),
    },
  },
  feedback: {
    ioc_hit_count: 3,
    ttp_hit_count: 4,
    affected_host_count: 3,
    affected_user_count: 2,
    last_hunted_at: isoOffsetHours(-0.5),
    last_hunt_status: 'completed_with_hits',
  },
  attribution: {
    environment_hits: {
      layer_1_ioc_match: 3,
      layer_2_behavioral: 4,
      computed_at: isoOffsetHours(-0.5),
    },
    environment_hits_total: 7,
  },
  lineage: {
    ingested_at: isoOffsetHours(-2),
    extracted_at: isoOffsetHours(-1.5),
    extraction_method: 'rss',
  },
};

// ── Report 2: LockBit 3.0 — ransomware chain overlap ─────────────────────────

const report2: ThreatReportDoc = {
  '@timestamp': isoOffsetHours(-4),
  content_fingerprint: fingerprint('lockbit-3-ransomware-shadow-copy-deletion-2026'),
  space_id: '*',
  source: {
    type: 'rss',
    name: 'Cisco Talos Intelligence',
    url: 'https://blog.talosintelligence.com/lockbit3-2026/',
    adapter_id: 'rss:talos',
    admiralty_rating: 'A',
    tier: 1,
  },
  content: {
    title:
      'LockBit 3.0 Variant Observed Deleting Shadow Copies and Encrypting with .locked Extension',
    body_text: `Talos researchers have identified a new LockBit 3.0 variant deployed in attacks against 
Windows Server environments. The ransomware arrives via compromised credentials and uses 
PsExec and WMI for lateral movement to domain controllers.

Once established on the DC, the malware executes vssadmin.exe delete shadows /all /quiet 
to inhibit recovery. Files are encrypted and renamed with a .locked extension. A ransom note 
named README_RESTORE.txt is written to the Desktop and Public folders.

Persistence is established via a Run-key registry entry and a renamed service binary at 
C:\\ProgramData\\svc.exe. The variant shares SHA-256 a3f5c9d1e8b74620fa1c0d5e2b9847361c0ded4488ab2f0e9a7c6b5d4e3f2a10 
with earlier CobaltStrike loaders, suggesting overlap in the delivery chain.

MITRE ATT&CK: T1490 (Inhibit System Recovery), T1486 (Data Encrypted for Impact), 
T1547.001 (Registry Run Keys), T1047 (WMI), T1021.002 (SMB/Admin Shares).`,
    language: 'en',
  },
  severity: { level: 'critical', score: 9.0 },
  rank_score: 0.85,
  corroborated_rank_score: 1.19, // 0.85 * 1.4 boost (3 IOC hits, 3 TTP hits)
  extracted: {
    iocs: [
      {
        type: 'sha256',
        value: SHARED_HASH,
        tier: 'active',
        tier_heuristic: 'active',
        tier_basis: 'hash_high_entropy',
        severity: 'high',
      },
      {
        type: 'file_name',
        value: 'README_RESTORE.txt',
        tier: 'active',
        tier_heuristic: 'active',
        tier_basis: 'ransom_note_name',
        severity: 'high',
      },
      {
        type: 'file_extension',
        value: '.locked',
        tier: 'active',
        tier_heuristic: 'active',
        tier_basis: 'ransomware_extension',
        severity: 'high',
      },
    ],
    ioc_set_hash: fingerprint(`lockbit-${SHARED_HASH}`),
    relevance: 0.94,
    detection_actionability: 'rule_candidate',
    ttps: {
      tactics: ['impact', 'persistence', 'lateral-movement'],
      techniques: ['T1490', 'T1486', 'T1547.001', 'T1047', 'T1021.002'],
    },
    behaviors: [
      {
        id: 'bh-010',
        technique_id: 'T1490',
        description: 'vssadmin delete shadows /all /quiet execution',
        telemetry_targets: ['process'],
        confidence: 0.97,
      },
      {
        id: 'bh-011',
        technique_id: 'T1486',
        description: 'Mass file encryption with .locked extension',
        telemetry_targets: ['file'],
        confidence: 0.93,
      },
      {
        id: 'bh-012',
        technique_id: 'T1547.001',
        description: 'Run-key persistence via Updater → svc.exe',
        telemetry_targets: ['registry'],
        confidence: 0.95,
      },
    ],
    threat_actors: ['LockBit'],
    target_sectors: ['finance', 'healthcare', 'manufacturing'],
    categories: ['ransomware', 'cybercrime', 'malware'],
    diamond: {
      adversary: {
        signal: 'PARTIAL',
        summary: 'LockBit affiliate — financially motivated cybercriminal operation.',
      },
      capability: {
        signal: 'HIGH',
        summary:
          'LockBit 3.0 ransomware with shadow-copy deletion, .locked encryption, and ransom-note deployment. Shares loader hash with CobaltStrike delivery.',
      },
      infrastructure: {
        signal: 'PARTIAL',
        summary: 'Compromised credentials used for initial access; shared C2 at 185.220.101.42.',
      },
      victim: {
        signal: 'PARTIAL',
        summary:
          'Windows Server environments, particularly domain controllers in financial and manufacturing sectors.',
      },
      signal_count: 4,
      model_id: 'diamond-extraction',
      extracted_at: isoOffsetHours(-3.5),
      extraction_mode: 'single_call',
      suitable: true,
    },
    gate: {
      is_intelligence: true,
      quality_class: 'intel',
      evidence_tier: 'primary',
      needs_render: false,
      has_original_commentary: true,
      reason: 'Original Talos research with specific behavioral indicators and file artifacts.',
      assessed_at: isoOffsetHours(-3.5),
    },
  },
  feedback: {
    ioc_hit_count: 2,
    ttp_hit_count: 3,
    affected_host_count: 2,
    affected_user_count: 1,
    last_hunted_at: isoOffsetHours(-1),
    last_hunt_status: 'completed_with_hits',
  },
  attribution: {
    environment_hits: {
      layer_1_ioc_match: 2,
      layer_2_behavioral: 3,
      computed_at: isoOffsetHours(-1),
    },
    environment_hits_total: 5,
  },
  lineage: {
    ingested_at: isoOffsetHours(-4),
    extracted_at: isoOffsetHours(-3.5),
    extraction_method: 'rss',
  },
};

// ── Report 3: CobaltStrike Beacon — initial access pattern ───────────────────

const report3: ThreatReportDoc = {
  '@timestamp': isoOffsetHours(-6),
  content_fingerprint: fingerprint('cobaltstrike-encoded-powershell-phishing-2026'),
  space_id: '*',
  source: {
    type: 'text_indicator_list',
    name: 'Maltrail — CobaltStrike C2 indicators',
    url: 'https://raw.githubusercontent.com/stamparm/maltrail/master/trails/static/malware/cobaltstrike.txt',
    adapter_id: 'text_indicator_list:maltrail-cobaltstrike',
    admiralty_rating: 'B',
    tier: 2,
  },
  content: {
    title: 'CobaltStrike Beacon C2 Indicators — Encoded PowerShell Delivery Pattern',
    body_text: `Structured indicator list of CobaltStrike beacon C2 infrastructure and delivery 
patterns observed in the wild. The initial access vector consistently uses spear-phishing emails 
with malicious Office macros that spawn an encoded PowerShell command. The command downloads 
and executes a DLL payload via rundll32.exe.

Indicators:
- 185.220.101.42 (C2 IP, HTTPS beaconing on port 443)
- evil-c2.onion.ws (C2 domain, resolves to above IP)
- SHA-256: a3f5c9d1e8b74620fa1c0d5e2b9847361c0ded4488ab2f0e9a7c6b5d4e3f2a10 (payload DLL)
- Registry persistence: HKLM\\Software\\Microsoft\\Windows\\CurrentVersion\\Run\\Updater

Pattern: OUTLOOK.EXE → powershell.exe (encoded) → rundll32.exe update.dll → beacon callback`,
    language: 'en',
  },
  severity: { level: 'high', score: 8.0 },
  rank_score: 0.78,
  corroborated_rank_score: 1.09, // 0.78 * 1.4 boost
  extracted: {
    iocs: [
      {
        type: 'ipv4',
        value: SHARED_C2_IP,
        tier: 'active',
        tier_heuristic: 'active',
        tier_basis: 'resolved_public_ip',
        severity: 'high',
      },
      {
        type: 'domain',
        value: SHARED_C2_DOMAIN,
        tier: 'active',
        tier_heuristic: 'active',
        tier_basis: 'resolved_domain',
        severity: 'high',
      },
      {
        type: 'sha256',
        value: SHARED_HASH,
        tier: 'active',
        tier_heuristic: 'active',
        tier_basis: 'hash_high_entropy',
        severity: 'high',
      },
      {
        type: 'registry_key',
        value: SHARED_RUN_KEY,
        tier: 'active',
        tier_heuristic: 'active',
        tier_basis: 'known_persistence_path',
        severity: 'medium',
      },
    ],
    ioc_set_hash: fingerprint(`cobaltstrike-${SHARED_C2_IP}${SHARED_HASH}${SHARED_RUN_KEY}`),
    relevance: 0.85,
    detection_actionability: 'rule_candidate',
    ttps: {
      tactics: ['execution', 'persistence', 'command-and-control'],
      techniques: ['T1059.001', 'T1547.001', 'T1071.001'],
    },
    behaviors: [
      {
        id: 'bh-020',
        technique_id: 'T1059.001',
        description: 'Encoded PowerShell execution spawned from Office application',
        telemetry_targets: ['process'],
        confidence: 0.94,
      },
      {
        id: 'bh-021',
        technique_id: 'T1547.001',
        description: 'Registry Run-key persistence',
        telemetry_targets: ['registry'],
        confidence: 0.91,
      },
    ],
    threat_actors: [],
    target_sectors: [],
    categories: ['malware', 'research-tools'],
    diamond: {
      adversary: { signal: 'NONE', summary: '' },
      capability: {
        signal: 'HIGH',
        summary:
          'CobaltStrike beacon with encoded PowerShell delivery, DLL side-loading, and registry persistence.',
      },
      infrastructure: {
        signal: 'HIGH',
        summary: 'C2 at 185.220.101.42:443 (TLS); domain evil-c2.onion.ws.',
      },
      victim: { signal: 'NONE', summary: '' },
      signal_count: 2,
      model_id: 'diamond-extraction',
      extracted_at: isoOffsetHours(-5.5),
      extraction_mode: 'single_call',
      suitable: true,
    },
    gate: {
      is_intelligence: true,
      quality_class: 'intel',
      evidence_tier: 'primary',
      needs_render: false,
      has_original_commentary: false,
      reason:
        'Structured indicator list from Maltrail project. No original analyst commentary, but IOCs are verified and curated.',
      assessed_at: isoOffsetHours(-5.5),
    },
  },
  feedback: {
    ioc_hit_count: 4,
    ttp_hit_count: 2,
    affected_host_count: 3,
    affected_user_count: 2,
    last_hunted_at: isoOffsetHours(-2),
    last_hunt_status: 'completed_with_hits',
  },
  attribution: {
    environment_hits: {
      layer_1_ioc_match: 4,
      layer_2_behavioral: 2,
      computed_at: isoOffsetHours(-2),
    },
    environment_hits_total: 6,
  },
  lineage: {
    ingested_at: isoOffsetHours(-6),
    extracted_at: isoOffsetHours(-5.5),
    extraction_method: 'text_indicator_list',
  },
};

// ── Report 4: Noise / no environment overlap ─────────────────────────────────

const report4: ThreatReportDoc = {
  '@timestamp': isoOffsetHours(-8),
  content_fingerprint: fingerprint('emotet-banking-trojan-resurgence-2026'),
  space_id: '*',
  source: {
    type: 'rss',
    name: 'ESET WeLiveSecurity',
    url: 'https://www.welivesecurity.com/2026/emotet-resurgence/',
    adapter_id: 'rss:eset-welivesecurity',
    admiralty_rating: 'A',
    tier: 1,
  },
  content: {
    title: 'Emotet Banking Trojan Resurfaces with New Delivery Mechanism',
    body_text: `ESET researchers report that the Emotet banking trojan has re-emerged after a 
six-month hiatus. The new variant uses infected Excel spreadsheets delivered via malicious 
email attachments. Upon execution, the malware contacts its C2 infrastructure at 
203.0.113.55:8080 and downloads TrickBot and QakBot secondary payloads.

SHA-256: 7e2b9a4c1f3d8602ae5b7c9d1e3f4a5b6c7d8e9f0a1b2c3d4e5f6a7b8c9d0e1f2

MITRE ATT&CK: T1566.001 (Spearphishing Attachment), T1105 (Ingress Tool Transfer).`,
    language: 'en',
  },
  severity: { level: 'medium', score: 5.5 },
  rank_score: 0.45,
  corroborated_rank_score: 0.45, // no environment hits — no boost
  extracted: {
    iocs: [
      {
        type: 'ipv4',
        value: '203.0.113.55',
        tier: 'active',
        tier_heuristic: 'active',
        tier_basis: 'resolved_public_ip',
        severity: 'medium',
      },
      {
        type: 'sha256',
        value: '7e2b9a4c1f3d8602ae5b7c9d1e3f4a5b6c7d8e9f0a1b2c3d4e5f6a7b8c9d0e1f2',
        tier: 'active',
        tier_heuristic: 'active',
        tier_basis: 'hash_high_entropy',
        severity: 'medium',
      },
    ],
    ioc_set_hash: fingerprint('emotet-203.0.113.55'),
    relevance: 0.5,
    detection_actionability: 'ttps_present',
    ttps: {
      tactics: ['initial-access', 'command-and-control'],
      techniques: ['T1566.001', 'T1105'],
    },
    behaviors: [
      {
        id: 'bh-030',
        technique_id: 'T1566.001',
        description: 'Excel macro delivering Emotet payload',
        telemetry_targets: ['process'],
        confidence: 0.8,
      },
    ],
    threat_actors: ['Emotet'],
    target_sectors: ['banking', 'retail'],
    categories: ['malware', 'cybercrime'],
    diamond: {
      adversary: {
        signal: 'PARTIAL',
        summary: 'Emotet operator infrastructure, likely affiliated with TrickBot cluster.',
      },
      capability: {
        signal: 'HIGH',
        summary:
          'Banking trojan with modular payload delivery and secondary-stage download capabilities.',
      },
      infrastructure: { signal: 'PARTIAL', summary: 'C2 at 203.0.113.55:8080 (HTTP).' },
      victim: { signal: 'NONE', summary: '' },
      signal_count: 3,
      model_id: 'diamond-extraction',
      extracted_at: isoOffsetHours(-7.5),
      extraction_mode: 'single_call',
      suitable: true,
    },
    gate: {
      is_intelligence: true,
      quality_class: 'intel',
      evidence_tier: 'primary',
      needs_render: false,
      has_original_commentary: true,
      reason: 'Original ESET research with IOCs and behavioral analysis.',
      assessed_at: isoOffsetHours(-7.5),
    },
  },
  // No feedback — this report has never hit the customer environment
  lineage: {
    ingested_at: isoOffsetHours(-8),
    extracted_at: isoOffsetHours(-7.5),
    extraction_method: 'rss',
  },
};

// ── Report 5: CISA KEV — structured vulnerability ────────────────────────────

const report5: ThreatReportDoc = {
  '@timestamp': isoOffsetHours(-10),
  content_fingerprint: fingerprint('cisa-kev-cve-2026-31415-confluence'),
  space_id: '*',
  source: {
    type: 'kev',
    name: 'CISA Known Exploited Vulnerabilities',
    url: 'https://www.cisa.gov/sites/default/files/feeds/known_exploited_vulnerabilities.json',
    adapter_id: 'kev:cisa-known-exploited-vulnerabilities',
    admiralty_rating: 'A',
    tier: 1,
  },
  content: {
    title: 'CVE-2026-31415: Atlassian Confluence Server Improper Authorization (CISA KEV)',
    body_text: `CISA has added CVE-2026-31415 to the Known Exploited Vulnerabilities catalog. 
This vulnerability in Atlassian Confluence Server allows unauthenticated remote code execution 
via improper authorization in the REST API. Active exploitation has been confirmed in the wild.

Vendor: Atlassian
Product: Confluence Server
Due Date: 2026-07-28
Ransomware Use: Known

Apply the latest security update immediately. This vulnerability is being actively exploited 
by multiple threat groups including ransomware affiliates.`,
    language: 'en',
  },
  severity: { level: 'critical', score: 9.8 },
  rank_score: 0.9,
  corroborated_rank_score: 0.9, // vulnerability, no telemetry hit
  extracted: {
    iocs: [
      {
        type: 'cve',
        value: 'CVE-2026-31415',
        tier: 'active',
        tier_heuristic: 'active',
        tier_basis: 'kev_entry',
        severity: 'critical',
      },
    ],
    ioc_set_hash: fingerprint('cve-2026-31415'),
    relevance: 0.92,
    detection_actionability: 'rule_candidate',
    ttps: {
      tactics: ['initial-access', 'execution'],
      techniques: ['T1190', 'T1059'],
    },
    behaviors: [
      {
        id: 'bh-040',
        technique_id: 'T1190',
        description: 'Exploit public-facing application (Confluence REST API RCE)',
        telemetry_targets: ['network'],
        confidence: 0.95,
      },
    ],
    threat_actors: [],
    target_sectors: ['technology', 'finance', 'government'],
    categories: ['vulnerability', 'cisa', 'kev'],
    diamond: {
      adversary: { signal: 'NONE', summary: '' },
      capability: {
        signal: 'HIGH',
        summary:
          'Unauthenticated RCE via Confluence REST API improper authorization. Actively exploited in the wild.',
      },
      infrastructure: { signal: 'NONE', summary: '' },
      victim: {
        signal: 'PARTIAL',
        summary:
          'Organizations running unpatched Atlassian Confluence Server exposed to the internet.',
      },
      signal_count: 2,
      model_id: 'diamond-extraction',
      extracted_at: isoOffsetHours(-9.5),
      extraction_mode: 'single_call',
      suitable: true,
    },
    gate: {
      is_intelligence: true,
      quality_class: 'intel',
      evidence_tier: 'primary',
      needs_render: false,
      has_original_commentary: false,
      reason: 'CISA KEV catalog entry with confirmed active exploitation.',
      assessed_at: isoOffsetHours(-9.5),
    },
    vulnerability: {
      cve_id: 'CVE-2026-31415',
      vendor: 'Atlassian',
      product: 'Confluence Server',
      name: 'Improper Authorization in REST API',
      cwes: ['CWE-285'],
      date_added: isoOffsetHours(-240),
      due_date: isoOffsetHours(168), // ~7 days from now
      ransomware_use: 'Known',
    },
  },
  lineage: {
    ingested_at: isoOffsetHours(-10),
    extracted_at: isoOffsetHours(-9.5),
    extraction_method: 'kev',
  },
};

// ── Subscription + Hunt Finding seed docs ────────────────────────────────────
//
// NOTE: subscription1/huntFinding1/2/3 doc literals were removed here (not just
// excluded from the bulk payload) — their shapes have drifted from the live
// `.kibana-threat-intel-subscriptions` / `.kibana-threat-intel-hunt-findings`
// mappings:
//   - subscriptions: real mapping has no @timestamp field at all; uses
//     created_at/updated_at/schedule_rrule/delivery/workflow_id instead.
//   - hunt-findings: real mapping expects hunt_run_id/hunt_run_status/
//     hypothesis/hypothesis_rationale/proposed_esql_rule/report_title/
//     risk_score/rule_name/severity/tier1_status, not the
//     technique_id/finding_type/description/hosts/tier/ioc_type/ioc_value
//     shape these docs used.
// This is real schema drift, not a syntax bug — rewriting both doc shapes
// against the current mappings is tracked separately, not patched live here.

// ── Seed function ────────────────────────────────────────────────────────────

const REPORT_DOCS = [
  { id: 'apt29-cobalt-strike-c2-infrastructure', doc: report1 },
  { id: 'lockbit-3-ransomware', doc: report2 },
  { id: 'cobaltstrike-encoded-powershell-phishing', doc: report3 },
  { id: 'emotet-banking-trojan-resurgence', doc: report4 },
  { id: 'cisa-kev-cve-2026-31415-confluence', doc: report5 },
];

export async function seedDarkWatchReports(
  { esClient }: { esClient: Client },
  log: ToolingLog
): Promise<void> {
  const reportOps = REPORT_DOCS.flatMap(({ id, doc }) => [
    { create: { _index: '.kibana-threat-reports', _id: `seed::${id}` } },
    doc,
  ]);

  const subOps: unknown[] = [
    // NOTE: subscription1 doc is commented out — `.kibana-threat-intel-
    // subscriptions` mapping has no @timestamp field at all (uses created_at/
    // updated_at/schedule_rrule/delivery/workflow_id instead). Same class of
    // schema drift as hunt-findings above; needs a proper rewrite, not a
    // live patch during a demo prep session.
  ];

  const findingOps: unknown[] = [
    // NOTE: hunt-findings docs (huntFinding1/2/3) are commented out of the bulk
    // payload — their shape (technique_id/finding_type/description/hosts/tier/
    // ioc_type/ioc_value) has drifted from the live `.kibana-threat-intel-
    // hunt-findings` mapping, which now expects hunt_run_id/hunt_run_status/
    // hypothesis/hypothesis_rationale/proposed_esql_rule/report_title/
    // risk_score/rule_name/severity/tier1_status instead. Real schema drift,
    // not a syntax bug — needs a proper rewrite against the current mapping,
    // tracked separately rather than papered over here.
  ];

  const operations = [...reportOps, ...subOps, ...findingOps];

  const response = await esClient.bulk({ operations, refresh: true });

  if (response.errors) {
    const failedItem = response.items.find((item) => item.index?.error || item.create?.error);
    const firstError = failedItem?.index?.error ?? failedItem?.create?.error;
    throw new Error(
      `seedDarkWatchReports: bulk index failed: ${JSON.stringify(firstError ?? 'unknown error')}`
    );
  }

  log.info(
    `Seeded ${REPORT_DOCS.length} threat-intelligence reports. (subscription + hunt-finding seed docs are currently disabled — see schema-drift NOTE above.)`
  );
}

export async function cleanupDarkWatchReports({ esClient }: { esClient: Client }): Promise<void> {
  await Promise.all(
    [
      '.kibana-threat-reports*',
      '.kibana-threat-intel-subscriptions',
      '.kibana-threat-intel-hunt-findings',
    ].map((index) =>
      esClient
        .deleteByQuery({
          index,
          query: { prefix: { _id: 'seed::' } },
          refresh: true,
          ignore_unavailable: true,
        })
        .catch(() => {})
    )
  );
}

// ── CLI runner ───────────────────────────────────────────────────────────────

run(
  async ({ log, flags }) => {
    const node = flags.node as string;
    const apiKey = flags.apiKey as string | undefined;
    const username = (flags.username as string | undefined) ?? 'elastic';
    const password = flags.password as string | undefined;
    const cleanup = Boolean(flags.cleanup);

    if (!node) {
      throw new Error('--node <elasticsearch url> is required');
    }
    if (!apiKey && !password) {
      throw new Error('Either --apiKey or --username/--password must be provided');
    }

    const esClient = createEsClient({
      url: node,
      username,
      password: password ?? '',
      apiKey,
      log,
    });

    if (cleanup) {
      log.info('Cleaning up prior seed:: threat-intel docs...');
      await cleanupDarkWatchReports({ esClient });
    }

    log.info('Seeding Dark Watch threat-intelligence reports...');
    await seedDarkWatchReports({ esClient }, log);
    log.success('Dark Watch reports seeded.');
  },
  {
    description:
      'Seeds threat-intelligence reports, subscriptions, and hunt findings for Dark Watch demo',
    flags: {
      string: ['node', 'apiKey', 'username', 'password'],
      boolean: ['cleanup'],
      help: `
        --node        Elasticsearch URL (required)
        --apiKey      API key for auth (preferred over username/password)
        --username    Kibana/ES username (default: elastic)
        --password    Kibana/ES password
        --cleanup     Delete previously-seeded seed:: docs before reseeding
      `,
    },
  }
);
