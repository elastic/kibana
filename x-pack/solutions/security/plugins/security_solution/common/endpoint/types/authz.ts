/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * Set of Endpoint Specific privileges that control application authorization. This interface is
 * used both on the client and server for consistency
 */
export interface EndpointAuthz {
  /** If the user has write permissions to the security solution app */
  canWriteSecuritySolution: boolean;
  /** If the user has read permissions to the security solution app */
  canReadSecuritySolution: boolean;
  /** If the user has permissions to access Fleet */
  canAccessFleet: boolean;
  /** If the user has permissions to access Fleet Agent policies */
  canReadFleetAgentPolicies: boolean;
  /** If the user has permissions to read Fleet Agents */
  canReadFleetAgents: boolean;
  /** If the user has permissions to write Fleet Agents */
  canWriteFleetAgents: boolean;
  /** If the user has permissions to write Integration policies in the Fleet app */
  canWriteIntegrationPolicies: boolean;
  /** If the user has permissions to access Endpoint management (includes check to ensure they also have access to fleet) */
  canAccessEndpointManagement: boolean;
  /** If the user has permissions to access Actions Log management and also has a platinum license (used for endpoint details flyout) */
  canAccessEndpointActionsLogManagement: boolean;
  /** If the user has permissions to create Artifacts by Policy */
  canCreateArtifactsByPolicy: boolean;
  /** If the user has write permissions to endpoint list */
  canWriteEndpointList: boolean;
  /** If the user has read permissions to endpoint list */
  canReadEndpointList: boolean;
  /** If the user has write permissions for policy management */
  canWritePolicyManagement: boolean;
  /** If the user has read permissions for policy management */
  canReadPolicyManagement: boolean;
  /** If the user has write permissions for actions log management */
  canWriteActionsLogManagement: boolean;
  /** If the user has read permissions for actions log management */
  canReadActionsLogManagement: boolean;
  /** If the user has permissions to isolate hosts */
  canIsolateHost: boolean;
  /** If the user has permissions to un-isolate (release) hosts */
  canUnIsolateHost: boolean;
  /** If the user has permissions to kill process on hosts */
  canKillProcess: boolean;
  /** If the user has permissions to suspend process on hosts */
  canSuspendProcess: boolean;
  /** If the user has permissions to get running processes on hosts */
  canGetRunningProcesses: boolean;
  /** If the user has permissions to use the Response Actions Console */
  canAccessResponseConsole: boolean;
  /** If the user has write permissions to use execute action */
  canWriteExecuteOperations: boolean;
  /** If the user has write permissions to use file operations */
  canWriteFileOperations: boolean;
  /** If user has write permission to use scan file path operations */
  canWriteScanOperations: boolean;
  /** If the user has write permissions for trusted applications */
  canWriteTrustedApplications: boolean;
  /** If the user has read permissions for trusted applications */
  canReadTrustedApplications: boolean;
  /** If the user has write permissions for host isolation exceptions */
  canWriteHostIsolationExceptions: boolean;
  /** If the user has read permissions for host isolation exceptions */
  canReadHostIsolationExceptions: boolean;
  /**
   * If the user has permissions to access host isolation exceptions. This could be set to false, while
   * `canReadHostIsolationExceptions` is true in cases where the license might have been downgraded.
   * It is used to show the UI elements that allow users to navigate to the host isolation exceptions.
   */
  canAccessHostIsolationExceptions: boolean;
  /**
   * If the user has permissions to delete host isolation exceptions. This could be set to true, while
   * `canWriteHostIsolationExceptions` is false in cases where the license might have been downgraded.
   * In that use case, users should still be allowed to ONLY delete entries.
   */
  canDeleteHostIsolationExceptions: boolean;
  /** If the user has write permissions for blocklist entries */
  canWriteBlocklist: boolean;
  /** If the user has read permissions for blocklist entries */
  canReadBlocklist: boolean;
  /** If the user has write permissions for event filters */
  canWriteEventFilters: boolean;
  /** If the user has read permissions for event filters */
  canReadEventFilters: boolean;

  /** if the user has write permissions for endpoint exceptions */
  canReadEndpointExceptions: boolean;
  /** if the user has read permissions for endpoint exceptions */
  canWriteEndpointExceptions: boolean;
}

export type EndpointAuthzKeyList = Array<keyof EndpointAuthz>;

export interface EndpointPrivileges extends EndpointAuthz {
  loading: boolean;
}
