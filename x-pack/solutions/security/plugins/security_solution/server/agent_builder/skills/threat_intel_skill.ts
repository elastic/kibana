/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ToolResultType, ToolType } from '@kbn/agent-builder-common/tools';
import { defineSkillType } from '@kbn/agent-builder-server/skills/type_definition';
import { z } from '@kbn/zod';

/**
 * Stubbed threat intelligence lookup skill for demo purposes.
 * Covers plan step: Check File & Hash Reputation.
 */
export const threatIntelSkill = defineSkillType({
  id: 'threat-intel-lookup',
  name: 'threat-intel-lookup',
  basePath: 'skills/security',
  description:
    'Look up file hashes, IPs, and domains against threat intelligence sources and indicators of compromise (IOCs) to determine if they are associated with known threats.',
  content: `# Threat Intelligence Lookup Skill

## Overview
Use this skill to check indicators of compromise (IOCs) — file hashes, IP addresses, and domains —
against known threat intelligence sources. This is critical for determining whether
an artifact is associated with known malware campaigns or threat actors.

## Process

### 1. Identify IOCs to Check
- Extract all relevant indicators from the alert and investigation:
  - File hashes (MD5, SHA1, SHA256)
  - IP addresses (source and destination)
  - Domain names and URLs
  - File names and paths

### 2. Hash Reputation Lookup
- Use \`security.threat-intel.check-hash\` to query the file hash
- Check against:
  - Known malware signature databases
  - Virus Total community intelligence
  - Elastic Threat Intelligence feed
- Interpret results: detection ratio, first/last seen dates, malware family

### 3. IP & Domain Reputation
- Check external IPs against threat feeds
- Look for:
  - Known C2 (Command & Control) infrastructure
  - Tor exit nodes or proxy services
  - Recently registered domains (< 30 days)
  - Domain generation algorithm (DGA) patterns

### 4. Correlate with Threat Campaigns
- Match IOCs against known threat actor TTPs
- Check if indicators appear in active threat advisories
- Determine if this is part of a known campaign or novel threat

## Confidence Scoring
- **Confirmed Malicious**: 3+ threat feeds flag the indicator, or matches known malware family
- **Suspicious**: 1-2 threat feeds flag, or indicator shows anomalous characteristics
- **Unknown**: No threat intelligence matches, requires further investigation
- **Benign**: Widely known legitimate software or infrastructure`,
  getInlineTools: () => [
    {
      id: 'security.threat-intel.check-hash',
      type: ToolType.builtin,
      description:
        'Check a file hash against threat intelligence sources for known malware associations',
      schema: z.object({
        hash: z.string().describe('The file hash to check (MD5, SHA1, or SHA256)'),
        hashType: z.enum(['md5', 'sha1', 'sha256']).default('sha256').describe('The type of hash'),
      }),
      handler: async () => {
        return {
          results: [
            {
              type: ToolResultType.other,
              data: {
                message: JSON.stringify(
                  {
                    hash: 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855',
                    hash_type: 'sha256',
                    verdict: 'malicious',
                    confidence: 'high',
                    detection_ratio: '48/72',
                    first_seen: '2026-01-15T08:30:00Z',
                    last_seen: '2026-02-16T14:22:00Z',
                    malware_family: 'Emotet',
                    threat_names: ['Trojan.Emotet', 'Win32/Emotet.AW', 'Trojan:Win32/Emotet!ml'],
                    tags: ['banking-trojan', 'loader', 'spam-distributor'],
                    threat_actors: ['TA542', 'Mummy Spider'],
                    related_campaigns: ['Emotet Epoch 5 - January 2026'],
                    mitre_techniques: ['T1566.001', 'T1059.001', 'T1055', 'T1071.001'],
                    sources: [
                      { name: 'Elastic Threat Intel', status: 'malicious' },
                      { name: 'VirusTotal', status: 'malicious', detections: '48/72' },
                      { name: 'AbuseIPDB', status: 'not_found' },
                      { name: 'AlienVault OTX', status: 'malicious', pulse_count: 12 },
                    ],
                  },
                  null,
                  2
                ),
              },
            },
          ],
        };
      },
    },
    {
      id: 'security.threat-intel.check-ip',
      type: ToolType.builtin,
      description:
        'Check an IP address against threat intelligence feeds for known malicious activity',
      schema: z.object({
        ip: z.string().describe('The IP address to check'),
      }),
      handler: async () => {
        return {
          results: [
            {
              type: ToolResultType.other,
              data: {
                message: JSON.stringify(
                  {
                    ip: '185.220.101.42',
                    verdict: 'suspicious',
                    confidence: 'medium',
                    geo: { country: 'DE', city: 'Frankfurt', asn: 'AS24940' },
                    categories: ['tor-exit-node', 'proxy'],
                    first_seen: '2025-11-20T00:00:00Z',
                    last_reported: '2026-02-15T12:00:00Z',
                    abuse_score: 65,
                    related_domains: ['suspicious-update.example.com'],
                  },
                  null,
                  2
                ),
              },
            },
          ],
        };
      },
    },
  ],
});
