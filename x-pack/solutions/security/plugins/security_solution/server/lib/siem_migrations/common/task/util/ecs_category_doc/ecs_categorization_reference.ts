/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export const ECS_CATEGORIZATION_REFERENCE = `# ECS Event Categorization Reference

## Guidelines
The event categorization fields work together to identify and group similar events from multiple data sources.
- Events from multiple data sources that are similar enough to be viewed or analyzed together, should fall into the same \`event.category\` field.
- Both \`event.category\` and \`event.type\` are arrays and may be populated with multiple allowed values, if the event can be reasonably classified into more than one category and/or type.
- \`event.kind\`, \`event.category\`, \`event.type\` and \`event.outcome\` all have allowed values. This is to normalize these fields. Values that aren't in the list of allowed values should not be used.
- Values of \`event.outcome\` are a very limited set to indicate success or failure. Domain-specific actions, such as deny and allow, that could be considered outcomes are not captured in the \`event.outcome\` field, but rather in the \`event.type\` and/or \`event.action\` fields.
- Values of \`event.category\`, \`event.type\`, and \`event.outcome\` are consistent across all values of \`event.kind\`.
- Attempt should be made to populate \`event.category\` and \`event.type\` fields for all the events. Values must be within the constraints of the allowed values. Only if that is not possible, these fields should be left empty with a proper explanation.
- Attempt should be made to limit event categorization to the 4 fields i.e. \`event.category\`, \`event.type\`, \`event.action\` and \`event.outcome\`.

## event.category
Second level in the ECS category hierarchy. Represents the "big buckets" of ECS categories. This field is an array. Closely related to \`event.type\`, which is used as a subcategory.

Allowed values (category: description | expected event.type values):
- api: API calls on a system (OS native libraries, managed sources, network protocols like SOAP, RPC, REST) | access, admin, allowed, change, creation, deletion, denied, end, info, start, user
- authentication: Challenge and response process where credentials are supplied and verified (Windows event logs, ssh logs) | start, end, info
- configuration: Creating, modifying, or deleting settings/parameters of an application, process, or system | access, change, creation, deletion, info
- database: Events relating to data storage and retrieval systems (MS SQL, MySQL, Elasticsearch, MongoDB, etc.) | access, change, info, error
- driver: OS device drivers and similar software entities (Windows drivers, kernel extensions, kernel modules) | change, end, info, start
- email: Email messages, attachments, and email network/protocol activity | info
- file: Information created on or existing on a filesystem (host-based and network-based sources) | access, change, creation, deletion, info
- host: Host inventory or host lifecycle events. For information about hosts themselves, not activity "happening on a host" | access, change, end, info, start
- iam: Identity and access management events relating to users, groups, and administration (Active Directory, LDAP, Okta, Duo) | admin, change, creation, deletion, group, info, user
- intrusion_detection: Intrusion detections from IDS/IPS systems (Snort, Suricata, Palo Alto threat detections) | allowed, denied, info
- library: Loading of a library (dll/so/dynlib) into a process. Driver related activity falls under "driver" | start
- malware: Malware detection events and alerts from EDR/EPP systems or network IDS/IPS | info
- network: All network activity including connection lifecycle, traffic, any event with an IP address | access, allowed, connection, denied, end, info, protocol, start
- package: Software packages installed on hosts | access, change, deletion, info, installation, start
- process: Process-specific information such as lifecycle events or process ancestry | access, change, end, info, start
- registry: Settings and assets stored in the Windows registry | access, change, creation, deletion
- session: Logical persistent connections to hosts and services (Windows Event logs, SSH logs, HTTP cookie-based sessions) | start, end, info
- threat: Events describing threat actors' targets, motives, or behaviors | indicator
- vulnerability: Vulnerability scan results (Tenable, Qualys, internal scanners) | info
- web: Web server access (apache, IIS, nginx, network observers like Zeek http log) | access, error, info

## event.type
Third level in the ECS category hierarchy. A categorization "sub-bucket" that, when used with \`event.category\`, enables filtering events to a level appropriate for single visualization. This field is an array.

Allowed values:
- access: Something was accessed. Examples: database AND access, file AND access (includes directory listings and file opens)
- admin: Related to admin objects. Example: iam AND change AND admin (administrative changes not specifically affecting a user or group)
- allowed: Something was allowed. Examples: network AND connection AND allowed (firewall allowed), intrusion_detection AND allowed (IPS allowed)
- change: Something has changed or was modified. Examples: process AND change, file AND change
- connection: Network traffic with sufficient info for flow/connection analysis (source/dest IPs, ports, bytes/packets). Includes Netflow, IPFIX, NGFW events. Used primarily with network category
- creation: Something was created. Example: file AND creation
- deletion: Something was deleted. Example: file AND deletion
- denied: Something was denied. Examples: network AND denied (firewall denied), intrusion_detection AND denied (IPS denied)
- device: Related to device objects. Example: host AND change AND device
- end: Something has ended. Example: process AND end
- error: Indicates or describes an error. Example: database AND error. Note: pipeline errors should use event.kind:pipeline_error instead
- group: Related to group objects. Example: iam AND creation AND group
- indicator: Contains details about indicators of compromise (IOCs). Example: threat AND indicator
- info: Purely informational, no state change or action reported. Examples: FIM initial file inventory, dump of running processes, intrusion_detection AND info
- installation: Something was installed. Example: package AND installation
- protocol: Contains protocol details or analysis beyond simply identifying the protocol. Example: network AND protocol AND connection AND end. The identified protocol should be populated in network.protocol field
- start: Something has started. Example: process AND start
- user: Related to user objects. Example: iam AND deletion AND user

## event.outcome
Lowest level in the ECS category hierarchy. Denotes whether the event represents a success or a failure from the perspective of the entity that produced the event.
- When a single transaction is described in multiple events, each event may populate different values according to their perspective.
- For compound events, populate with the value that best captures the overall success or failure from the event producer's perspective.
- Not all events will have an associated outcome. Generally not populated for metric events, events with event.type:info, or events for which an outcome does not make logical sense.

Allowed values:
- failure: Event describes a failed result. Example: event.category:file AND event.type:access AND event.outcome:failure
- success: Event describes a successful result. Example: event.category:file AND event.type:creation AND event.outcome:success
- unknown: Event describes only an attempt for which the result is unknown from the event producer's perspective. Should not be used when an outcome doesn't make logical sense; in such cases event.outcome should not be populated.

## Examples

Firewall blocking a network connection (successfully blocked):
  event.kind: "event", event.category: ["network"], event.type: ["connection", "denied"], event.outcome: "success", event.action: "dropped"
  Note: "denied" is the normalized type; the specific action ("blocked", "dropped", "quarantined") goes in event.action.

Failed attempt to create a user account:
  event.kind: "event", event.category: ["iam"], event.type: ["user", "creation"], event.outcome: "failure"

Informational listing of a file (FIM inventory, no access/modification):
  event.kind: "event", event.category: ["file"], event.type: ["info"]
  Note: No outcome context available, so event.outcome is not populated.

IDS failed to block a network connection (event is an alert):
  event.kind: "alert", event.category: ["intrusion_detection", "network"], event.type: ["connection", "denied"], event.outcome: "failure"

Windows Logon Activity
  event.category: "authentication",event.action in ("logon-failed", "logged-in")

Multiple AWS Service Logging Deleted or Stopped
    event.provider in ("ec2.amazonaws.com","route53resolver.amazonaws.com","s3.amazonaws.com", "cloudtrail.amazonaws.com"), event.action in ("DeleteFlowLogs","DeleteResolverQueryLogConfig", "DeleteTrail", "StopLogging")

`;
