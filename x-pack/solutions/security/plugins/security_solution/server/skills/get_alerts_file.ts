/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { SkillFile } from '@kbn/agent-skills-common';

export function getSecurityGetAlertsFile(): SkillFile {
  return {
    id: 'security.get_alerts',
    name: 'Security Alerts Guide',
    shortDescription: 'Guide for using security alerts',
    content: `Security alerts provide detection and response capabilities for security threats. Use this skill to search and retrieve security detection alerts based on various criteria.

=== security.get_alerts ===

Search and retrieve security detection alerts. Supports filtering by time range, severity, workflow status, and natural language queries.

Parameters:
- query (string, optional): Natural language query to search for security alerts. Searches across:
  - Alert rule names (weighted 3x)
  - Alert rule descriptions (weighted 2x)
  - Alert reasons
  - Messages
  - Tags
- timeRange (object, optional): Time range filter for alerts. Contains:
  - from (string, required): Start time in ISO 8601 format (e.g., "2024-01-01T00:00:00Z")
  - to (string, required): End time in ISO 8601 format (e.g., "2024-01-02T00:00:00Z")
- severity (enum, optional): Filter alerts by severity level:
  - 'low': Low severity alerts
  - 'medium': Medium severity alerts
  - 'high': High severity alerts
  - 'critical': Critical severity alerts
- workflowStatus (enum, optional): Filter alerts by workflow status:
  - 'open': Alerts that are open and need attention
  - 'acknowledged': Alerts that have been acknowledged
  - 'closed': Alerts that have been closed
- limit (number, optional): Maximum number of alerts to return (default: 10, max: 100)

Example usage:
1. Get all alerts (default limit of 10):
   tool("invoke_skill", {"skillId":"security.get_alerts","params":{}})

2. Get critical severity alerts:
   tool("invoke_skill", {"skillId":"security.get_alerts","params":{"severity":"critical"}})

3. Get high severity alerts that are open:
   tool("invoke_skill", {"skillId":"security.get_alerts","params":{"severity":"high","workflowStatus":"open"}})

4. Search alerts with a natural language query:
   tool("invoke_skill", {"skillId":"security.get_alerts","params":{"query":"malware","limit":20}})

5. Get alerts from a specific time range:
   tool("invoke_skill", {"skillId":"security.get_alerts","params":{"timeRange":{"from":"2024-01-01T00:00:00Z","to":"2024-01-02T00:00:00Z"}}})

6. Get acknowledged alerts with high severity:
   tool("invoke_skill", {"skillId":"security.get_alerts","params":{"severity":"high","workflowStatus":"acknowledged","limit":50}})

7. Search for ransomware-related open alerts:
   tool("invoke_skill", {"skillId":"security.get_alerts","params":{"query":"ransomware","workflowStatus":"open"}})

Response format:
Returns an array of alert objects, each containing:
- Alert ID, rule name, rule description
- Alert reason and message
- Timestamp, severity, and workflow status
- Tags and other metadata`,
    filePath: '/skills/security/get_alerts.md',
  };
}

