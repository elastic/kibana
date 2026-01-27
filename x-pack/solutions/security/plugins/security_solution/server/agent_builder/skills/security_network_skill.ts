/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Skill } from '@kbn/agent-builder-common/skills';
import { createToolProxy } from './utils/create_tool_proxy';

export const SECURITY_NETWORK_SKILL: Skill = {
  namespace: 'security.network',
  name: 'Security Network',
  description: 'Read-only network traffic analysis and investigation guidance',
  content: `# Security Network

## What this skill does
Provides read-only guidance for network traffic analysis, DNS queries, HTTP traffic, TLS certificates, and network flow investigations in the Security Solution.

## When to use
- The user wants to investigate network traffic patterns or anomalies.
- You need to analyze DNS queries, HTTP requests, or TLS handshakes.
- The user wants to identify top talkers, top countries, or network flow patterns.
- You need to correlate network activity with hosts or users.

## Key network data types
- **Network Details**: IP address and host-level network information
- **DNS**: Domain name resolution queries and responses
- **HTTP**: HTTP request/response traffic and methods
- **TLS**: TLS/SSL certificate information and handshakes
- **Top Countries**: Geographic distribution of network traffic
- **Top N Flow**: Highest volume network flows (source/destination IPs)
- **Network Users**: Users associated with network activity

## Relevant indices and fields
Common indices for network data:
- \`logs-*\` - General logs including network events
- \`filebeat-*\` - Filebeat network module data
- \`packetbeat-*\` - Packetbeat network traffic data
- \`auditbeat-*\` - Auditbeat network events

Common network fields:
- \`source.ip\`, \`destination.ip\` - Source and destination IPs
- \`source.port\`, \`destination.port\` - Source and destination ports
- \`network.bytes\`, \`network.packets\` - Traffic volume
- \`network.direction\` - Inbound/outbound
- \`network.protocol\` - Protocol (TCP, UDP, etc.)
- \`dns.question.name\`, \`dns.resolved_ip\` - DNS query data
- \`http.request.method\`, \`http.response.status_code\` - HTTP data
- \`tls.server.issuer\`, \`tls.server.subject\` - TLS certificate data
- \`geo.country_iso_code\`, \`geo.city_name\` - Geographic data

## Tools and operations
- Use \`platform.search\` for network data queries:
  - \`operation: "search"\` for KQL-style queries
  - \`operation: "execute_esql"\` for ES|QL aggregations

## Example queries

### Find top DNS domains
\`\`\`
tool("invoke_skill", {
  name: "platform.search",
  parameters: {
    operation: "execute_esql",
    params: {
      query: "FROM logs-* | WHERE dns.question.name IS NOT NULL | STATS count = COUNT(*) BY dns.question.name | SORT count DESC | LIMIT 20"
    }
  }
})
\`\`\`

### Find network traffic by country
\`\`\`
tool("invoke_skill", {
  name: "platform.search",
  parameters: {
    operation: "execute_esql",
    params: {
      query: "FROM packetbeat-* | WHERE destination.geo.country_iso_code IS NOT NULL | STATS bytes = SUM(network.bytes) BY destination.geo.country_iso_code | SORT bytes DESC | LIMIT 10"
    }
  }
})
\`\`\`

### Investigate specific IP
\`\`\`
tool("invoke_skill", {
  name: "platform.search",
  parameters: {
    operation: "search",
    params: {
      index: "packetbeat-*",
      query: { bool: { should: [{ term: { "source.ip": "192.168.1.100" } }, { term: { "destination.ip": "192.168.1.100" } }], minimum_should_match: 1 } },
      fields: ["@timestamp", "source.ip", "destination.ip", "destination.port", "network.protocol", "network.bytes"],
      size: 50
    }
  }
})
\`\`\`

## Safe workflow
1) Ask for time range and specific network indicators (IP, domain, port) if not provided.
2) Start with a narrow query targeting specific IPs, domains, or protocols.
3) Use aggregations to identify patterns before diving into raw events.
4) Summarize findings with counts, top values, and example events.

## Guardrails
- Read-only only; do not block IPs or modify network rules.
- Be mindful of large result sets; use LIMIT and aggregations.
`,
  tools: [createToolProxy({ toolId: 'platform.search' })],
};
