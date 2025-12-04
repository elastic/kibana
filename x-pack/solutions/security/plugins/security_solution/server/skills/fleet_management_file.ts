/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { SkillFile } from '@kbn/agent-skills-common';

export function getFleetManagementFile(): SkillFile {
  return {
    id: 'security.fleet_management',
    name: 'Fleet Management Response Actions Guide',
    shortDescription: 'Always call this before executing any fleet management actions',
    content: `Fleet Management provides endpoint response actions for managing and securing endpoints. This guide covers both executing response actions and waiting for their completion.

=== security.fleet_management ===

Execute endpoint response actions on managed hosts using console-style command strings.

Parameters:
- command_string (string, required): The full command string to execute, following console command syntax. Examples:
  - "isolate --comment Suspicious activity"
  - "execute --command ps -aux --comment checking processes"
  - "get-file --path /etc/passwd --comment retrieving file"
- endpoint_ids (array of strings, required): Array of endpoint IDs (agent IDs) to execute the action on. Must contain at least one endpoint ID.
- agent_type (enum, optional): The agent type. Defaults to 'endpoint'. Valid values:
  - 'endpoint': Elastic Endpoint
  - 'sentinel_one': SentinelOne
  - 'crowdstrike': CrowdStrike
  - 'microsoft_defender_endpoint': Microsoft Defender Endpoint

Available commands and their flags:
- isolate [--comment <text>]: Isolate the host from the network. Prevents the endpoint from communicating with other systems.
- release [--comment <text>]: Release the host from isolation. Restores network connectivity.
- status: Show host status information. Returns current endpoint status without executing an action.
- processes [--comment <text>]: List all running processes on the endpoint.
- kill-process --entityId <id> | --pid <number> [--comment <text>]: Terminate a process. Use either entityId or pid to identify the process.
- suspend-process --entityId <id> | --pid <number> [--comment <text>]: Suspend a process temporarily. Use either entityId or pid to identify the process.
- get-file --path <filepath> [--comment <text>]: Retrieve a file from the host. Specify the full path to the file.
- upload --file [--overwrite] [--comment <text>]: Upload a file to the host. The --file flag specifies the file to upload. Use --overwrite to overwrite existing files.
- execute --command <shell_command> [--timeout <ms>] [--comment <text>]: Execute a shell command on the endpoint. Optional timeout in milliseconds.
- scan --path <filepath> [--comment <text>]: Scan a path for malware. Specify the directory or file path to scan.

Example usage:
1. Execute a shell command on an endpoint:
   tool("invoke_skill", {"skillId":"security.fleet_management","params":{"command_string":"execute --command whoami","endpoint_ids":["<endpoint_uuid>"]}})

2. Execute ps -aux with a comment:
   tool("invoke_skill", {"skillId":"security.fleet_management","params":{"command_string":"execute --command ps -aux --comment checking processes","endpoint_ids":["<endpoint_uuid>"]}})

3. Isolate a host:
   tool("invoke_skill", {"skillId":"security.fleet_management","params":{"command_string":"isolate --comment Investigating suspicious activity","endpoint_ids":["<endpoint_uuid>"]}})

4. Release a host from isolation:
   tool("invoke_skill", {"skillId":"security.fleet_management","params":{"command_string":"release --comment Investigation complete","endpoint_ids":["<endpoint_uuid>"]}})

5. Get host status:
   tool("invoke_skill", {"skillId":"security.fleet_management","params":{"command_string":"status","endpoint_ids":["<endpoint_uuid>"]}})

6. List running processes:
   tool("invoke_skill", {"skillId":"security.fleet_management","params":{"command_string":"processes","endpoint_ids":["<endpoint_uuid>"]}})

7. Kill a process by entity ID:
   tool("invoke_skill", {"skillId":"security.fleet_management","params":{"command_string":"kill-process --entityId <process_entity_id>","endpoint_ids":["<endpoint_uuid>"]}})

8. Kill a process by PID:
   tool("invoke_skill", {"skillId":"security.fleet_management","params":{"command_string":"kill-process --pid 1234","endpoint_ids":["<endpoint_uuid>"]}})

9. Get a file from the host:
   tool("invoke_skill", {"skillId":"security.fleet_management","params":{"command_string":"get-file --path /etc/passwd --comment retrieving file","endpoint_ids":["<endpoint_uuid>"]}})

10. Upload a file to the host:
    tool("invoke_skill", {"skillId":"security.fleet_management","params":{"command_string":"upload --file --comment uploading script","endpoint_ids":["<endpoint_uuid>"]}})

11. Upload a file with overwrite enabled:
    tool("invoke_skill", {"skillId":"security.fleet_management","params":{"command_string":"upload --file --overwrite --comment replacing existing file","endpoint_ids":["<endpoint_uuid>"]}})

12. Scan a path for malware:
    tool("invoke_skill", {"skillId":"security.fleet_management","params":{"command_string":"scan --path /var/log --comment scanning logs","endpoint_ids":["<endpoint_uuid>"]}})

Response format:
Returns an object containing:
- action_id: The action ID (use this with security.wait_for_action to retrieve results)
- Other action metadata

=== security.wait_for_action ===

Wait for a fleet management response action to complete and return the results. This skill should be called after executing a response action using security.fleet_management.

IMPORTANT WORKFLOW:
1. First, use security.fleet_management to execute a response action. This returns an action_id.
2. Then, use security.wait_for_action with the action_id to wait for the action to complete and retrieve the output.

Parameters:
- action_id (string, required): The action ID returned from security.fleet_management
- endpoint_id (string, optional): Optional endpoint ID to filter results for a specific endpoint
- timeout_seconds (number, optional): Maximum time to wait for the action to complete in seconds (default: 300 seconds / 5 minutes)
- poll_interval_seconds (number, optional): How often to check action status in seconds (default: 5 seconds)

The skill will poll the action status until it completes, fails, or times out.

Example usage:
1. Wait for an action to complete with default timeout (5 minutes):
   tool("invoke_skill", {"skillId":"security.wait_for_action","params":{"action_id":"<action_uuid>"}})

2. Wait for an action with a shorter timeout (60 seconds):
   tool("invoke_skill", {"skillId":"security.wait_for_action","params":{"action_id":"<action_uuid>","timeout_seconds":60}})

3. Wait for an action and filter output to a specific endpoint:
   tool("invoke_skill", {"skillId":"security.wait_for_action","params":{"action_id":"<action_uuid>","endpoint_id":"<endpoint_uuid>"}})

4. Wait with custom timeout and poll interval:
   tool("invoke_skill", {"skillId":"security.wait_for_action","params":{"action_id":"<action_uuid>","timeout_seconds":120,"poll_interval_seconds":10}})

5. Typical workflow: after executing a command, wait for results:
   Step 1: Execute command
   tool("invoke_skill", {"skillId":"security.fleet_management","params":{"command_string":"execute --command ps -aux","endpoint_ids":["<endpoint_uuid>"]}})
   
   Step 2: Wait for results (use action_id from step 1)
   tool("invoke_skill", {"skillId":"security.wait_for_action","params":{"action_id":"<action_id_from_fleet_management>","timeout_seconds":60}})

Response format:
Returns an object containing:
- Action status and completion information
- Results/output from the action (if available)
- Endpoint-specific results (if endpoint_id was specified)`,
    filePath: '/skills/security/fleet_management.md',
  };
}

