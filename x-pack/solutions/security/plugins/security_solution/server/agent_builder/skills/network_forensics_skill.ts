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
 * Stubbed network forensics skill for demo purposes.
 * Covers plan steps: Review Network Activity & Assess Lateral Movement.
 */
export const networkForensicsSkill = defineSkillType({
  id: 'network-forensics',
  name: 'network-forensics',
  basePath: 'skills/security',
  description:
    'Investigate network connections from an affected host — identify suspicious outbound connections, C2 communication patterns, lateral movement, and scope of potential compromise across the environment.',
  content: `# Network Forensics Skill

## Overview
Use this skill to investigate network activity from a compromised or suspected host.
Covers outbound connection analysis, C2 detection, and lateral movement assessment.

## Process

### 1. Review Outbound Connections
- Use \`security.network-forensics.get-connections\` to retrieve network connections from the host
- Focus on connections made around the time of the alert (+/- 1 hour)
- Flag:
  - Connections to external IPs not in known-good lists
  - Connections to known C2 infrastructure (cross-reference with threat intel)
  - Unusual ports (high ports, non-standard HTTP/S)
  - DNS requests to suspicious or newly registered domains
  - Beaconing patterns (regular interval connections)

### 2. Identify C2 Communication
- Look for hallmarks of C2 traffic:
  - Regular beacon intervals (e.g., every 60s, with jitter)
  - Encoded or encrypted payloads over HTTP/S
  - DNS tunneling (long subdomain strings, high query volume)
  - Connections to cloud services used for C2 (paste sites, cloud storage)
- Use \`security.network-forensics.detect-beaconing\` for automated pattern detection

### 3. Assess Lateral Movement
- Search for connections from the affected host to internal systems
- Look for:
  - SMB/RPC connections to other workstations or servers
  - RDP sessions initiated from the host
  - WinRM or SSH connections
  - Pass-the-hash or pass-the-ticket patterns
  - Unusual authentication events on remote systems

### 4. Determine Scope
- Identify all hosts that received connections from the affected host
- Check if similar malware alerts exist on those hosts
- Build a timeline of potential spread
- Determine blast radius for containment decisions

## Network IOC Patterns
- Beaconing: Regular intervals (30s-300s) with < 10% jitter
- Data exfiltration: Large outbound transfers to unusual destinations
- Tunneling: DNS queries > 100 chars or > 50 queries/min to single domain`,
  getInlineTools: () => [
    {
      id: 'security.network-forensics.get-connections',
      type: ToolType.builtin,
      description:
        'Get network connections from a host within a time window, including process and destination details',
      schema: z.object({
        hostName: z.string().describe('The hostname to investigate'),
        timeWindowHours: z
          .number()
          .min(1)
          .max(72)
          .default(2)
          .describe('Time window in hours around the alert'),
      }),
      handler: async () => {
        return {
          results: [
            {
              type: ToolResultType.other,
              data: {
                message: JSON.stringify(
                  {
                    host: 'WORKSTATION-042',
                    time_range: { from: '2026-02-17T07:00:00Z', to: '2026-02-17T11:00:00Z' },
                    total_connections: 47,
                    suspicious_connections: [
                      {
                        timestamp: '2026-02-17T09:15:32Z',
                        process: 'update_helper.exe',
                        pid: 7231,
                        destination_ip: '185.220.101.42',
                        destination_port: 443,
                        protocol: 'tcp',
                        bytes_sent: 1240,
                        bytes_received: 8920,
                        direction: 'outbound',
                        geo: { country: 'DE' },
                        dns_name: 'cdn-update.example.com',
                      },
                      {
                        timestamp: '2026-02-17T09:16:33Z',
                        process: 'update_helper.exe',
                        pid: 7231,
                        destination_ip: '185.220.101.42',
                        destination_port: 443,
                        protocol: 'tcp',
                        bytes_sent: 890,
                        bytes_received: 4200,
                        direction: 'outbound',
                        geo: { country: 'DE' },
                        dns_name: 'cdn-update.example.com',
                      },
                      {
                        timestamp: '2026-02-17T09:22:10Z',
                        process: 'powershell.exe',
                        pid: 7512,
                        destination_ip: '10.0.15.100',
                        destination_port: 445,
                        protocol: 'tcp',
                        bytes_sent: 3200,
                        bytes_received: 1100,
                        direction: 'internal',
                        dns_name: 'FILE-SERVER-01',
                      },
                    ],
                    internal_lateral_connections: [
                      {
                        timestamp: '2026-02-17T09:22:10Z',
                        destination: 'FILE-SERVER-01 (10.0.15.100)',
                        port: 445,
                        protocol: 'SMB',
                        process: 'powershell.exe',
                      },
                      {
                        timestamp: '2026-02-17T09:25:44Z',
                        destination: 'DC-01 (10.0.15.10)',
                        port: 88,
                        protocol: 'Kerberos',
                        process: 'update_helper.exe',
                      },
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
      id: 'security.network-forensics.detect-beaconing',
      type: ToolType.builtin,
      description:
        'Detect beaconing patterns in network traffic from a host, identifying potential C2 communication',
      schema: z.object({
        hostName: z.string().describe('The hostname to analyze'),
        destinationIp: z
          .string()
          .optional()
          .describe('Optional: focus on a specific destination IP'),
      }),
      handler: async () => {
        return {
          results: [
            {
              type: ToolResultType.other,
              data: {
                message: JSON.stringify(
                  {
                    host: 'WORKSTATION-042',
                    beaconing_detected: true,
                    patterns: [
                      {
                        destination_ip: '185.220.101.42',
                        destination_port: 443,
                        avg_interval_seconds: 61.2,
                        jitter_percentage: 4.8,
                        total_beacons: 38,
                        first_beacon: '2026-02-17T08:45:00Z',
                        last_beacon: '2026-02-17T09:55:00Z',
                        confidence: 'high',
                        pattern: 'regular_interval',
                        process: 'update_helper.exe',
                        assessment:
                          'Strong C2 beaconing pattern — regular ~60s interval with low jitter',
                      },
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
  ],
});
