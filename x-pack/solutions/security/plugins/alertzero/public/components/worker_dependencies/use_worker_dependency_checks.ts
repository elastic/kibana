/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useMemo } from 'react';
import useObservable from 'react-use/lib/useObservable';
import { useQuery } from '@kbn/react-query';
import {
  SYSTEM_SECURITY_WORKER_DETECTION_RULE_COVERAGE_ID,
  SYSTEM_SECURITY_WORKER_FLOOR_ALERT_TRIAGE_ID,
  SYSTEM_SECURITY_WORKER_FLOOR_ATTACK_DISCOVERY_ID,
  SYSTEM_SECURITY_WORKER_FORENSICS_ENDPOINT_ANALYSIS_ID,
  SYSTEM_SECURITY_WORKER_HUNT_CONTINUOUS_THREAT_HUNT_ID,
} from '@kbn/alertzero-common';
import {
  CONTEXT_ENGINE_ENABLED_SETTING_ID,
  SECURITY_SOLUTION_ALERT_ANALYSIS_WORKFLOW_ENABLED,
} from '@kbn/management-settings-ids';
import type { CoreStart } from '@kbn/core/public';
import { useKibana } from '@kbn/kibana-react-plugin/public';
import { queryKeys } from '../../query_keys';

export const ATTACK_DISCOVERY_WORKFLOWS_SETTING = 'securitySolution:enableAttackDiscoveryWorkflows';
const FLEET_PACKAGE_POLICIES_PATH = '/api/fleet/package_policies';
const UI_SETTINGS_PATH = '/internal/kibana/settings';
const WORKFLOWS_MGET_PATH = '/api/workflows/mget';
const ALERT_ANALYSIS_WORKFLOW_ID = 'system-security-alert-analysis';

export const THREAT_REPORT_WORKFLOWS = [
  { id: 'system-security-threat-intel-ingest-feeds', name: 'ingest' },
  { id: 'system-security-threat-intel-enrich-report', name: 'enrich' },
] as const;

export type DependencyStatus = 'satisfied' | 'missing' | 'unknown' | 'loading';

interface WorkflowState {
  id: string;
  enabled?: boolean;
}

interface UserSettings {
  settings: Record<string, { userValue?: boolean }>;
}

export const useWorkerDependencyChecks = (workerId: string) => {
  const {
    services: { http, uiSettings, featureFlags },
  } = useKibana<CoreStart>();
  const spaceBasePath = http.basePath.get();
  const contextEngineEnabled$ = useMemo(
    () => uiSettings.get$<boolean>(CONTEXT_ENGINE_ENABLED_SETTING_ID, false),
    [uiSettings]
  );
  const attackDiscoveryWorkflowsEnabled$ = useMemo(
    () => uiSettings.get$<boolean>(ATTACK_DISCOVERY_WORKFLOWS_SETTING, false),
    [uiSettings]
  );
  const alertAnalysisEnabled$ = useMemo(
    () => uiSettings.get$<boolean>(SECURITY_SOLUTION_ALERT_ANALYSIS_WORKFLOW_ENABLED, false),
    [uiSettings]
  );
  const contextEngineEnabled = useObservable(contextEngineEnabled$, false);
  const attackDiscoveryWorkflowsEnabled = useObservable(attackDiscoveryWorkflowsEnabled$, false);
  const alertAnalysisEnabled = useObservable(alertAnalysisEnabled$, false);
  const attackDiscoveryFeatureAvailable = featureFlags.useBooleanValue(
    'securitySolution.attackDiscoveryWorkflowsEnabled',
    true
  );

  const needsContextEngine =
    workerId === SYSTEM_SECURITY_WORKER_HUNT_CONTINUOUS_THREAT_HUNT_ID ||
    workerId === SYSTEM_SECURITY_WORKER_DETECTION_RULE_COVERAGE_ID ||
    workerId === SYSTEM_SECURITY_WORKER_FLOOR_ATTACK_DISCOVERY_ID ||
    workerId === SYSTEM_SECURITY_WORKER_FORENSICS_ENDPOINT_ANALYSIS_ID;
  const needsDefend = workerId === SYSTEM_SECURITY_WORKER_FORENSICS_ENDPOINT_ANALYSIS_ID;
  const needsThreatReports = workerId === SYSTEM_SECURITY_WORKER_HUNT_CONTINUOUS_THREAT_HUNT_ID;
  const needsAlertAnalysis = workerId === SYSTEM_SECURITY_WORKER_FLOOR_ALERT_TRIAGE_ID;

  // The Alert Analysis settings page saves through its own API. Read the current space's saved
  // setting rather than relying only on the browser UI settings cache after returning from it.
  const alertAnalysisSetting = useQuery({
    queryKey: queryKeys.workerDependencies.alertAnalysisSetting(
      spaceBasePath,
      alertAnalysisEnabled
    ),
    enabled: needsAlertAnalysis,
    queryFn: () => http.get<UserSettings>(UI_SETTINGS_PATH),
    retry: false,
    refetchOnMount: 'always',
    refetchOnWindowFocus: 'always',
  });

  const alertAnalysisWorkflow = useQuery({
    queryKey: queryKeys.workerDependencies.alertAnalysisWorkflow(spaceBasePath),
    enabled: needsAlertAnalysis,
    queryFn: () =>
      http.post<WorkflowState[]>(WORKFLOWS_MGET_PATH, {
        version: '2023-10-31',
        body: JSON.stringify({ ids: [ALERT_ANALYSIS_WORKFLOW_ID], source: ['enabled'] }),
      }),
    retry: false,
    refetchOnMount: 'always',
    refetchOnWindowFocus: 'always',
  });

  const defendPolicies = useQuery({
    queryKey: queryKeys.workerDependencies.defendPolicies(spaceBasePath),
    enabled: needsDefend,
    queryFn: () =>
      http.get<{ total: number }>(FLEET_PACKAGE_POLICIES_PATH, {
        version: '2023-10-31',
        query: { kuery: 'ingest-package-policies.package.name:endpoint', perPage: 1 },
      }),
    retry: false,
    refetchOnMount: 'always',
    refetchOnWindowFocus: 'always',
  });

  const threatReportWorkflows = useQuery({
    queryKey: queryKeys.workerDependencies.threatReportWorkflows(spaceBasePath),
    enabled: needsThreatReports,
    queryFn: () =>
      http.post<WorkflowState[]>(WORKFLOWS_MGET_PATH, {
        version: '2023-10-31',
        body: JSON.stringify({
          ids: THREAT_REPORT_WORKFLOWS.map(({ id }) => id),
          source: ['enabled'],
        }),
      }),
    retry: false,
    refetchOnMount: 'always',
    refetchOnWindowFocus: 'always',
  });

  const defendStatus: DependencyStatus = !needsDefend
    ? 'satisfied'
    : defendPolicies.isLoading
    ? 'loading'
    : defendPolicies.error || !defendPolicies.data
    ? 'unknown'
    : defendPolicies.data.total > 0
    ? 'satisfied'
    : 'missing';

  const workflowStatus = (id: string): DependencyStatus => {
    if (!needsThreatReports) return 'satisfied';
    if (threatReportWorkflows.isLoading) return 'loading';
    if (threatReportWorkflows.error || !threatReportWorkflows.data) return 'unknown';
    // The Workflows API filters unreadable workflows from a successful bulk read. An omitted
    // workflow cannot safely be called absent, so give the user a verification message.
    const workflow = threatReportWorkflows.data.find((entry) => entry.id === id);
    if (!workflow) return 'unknown';
    return workflow.enabled === true ? 'satisfied' : 'missing';
  };

  const alertAnalysisWorkflowState = alertAnalysisWorkflow.data?.find(
    ({ id }) => id === ALERT_ANALYSIS_WORKFLOW_ID
  );
  const alertAnalysisWorkflowStatus: DependencyStatus = !needsAlertAnalysis
    ? 'satisfied'
    : alertAnalysisWorkflow.isLoading
    ? 'loading'
    : alertAnalysisWorkflow.error || !alertAnalysisWorkflow.data
    ? 'unknown'
    : !alertAnalysisWorkflowState
    ? 'unknown'
    : alertAnalysisWorkflowState.enabled === true
    ? 'satisfied'
    : 'missing';
  const alertAnalysisRuntimeStatus: DependencyStatus = !needsAlertAnalysis
    ? 'satisfied'
    : alertAnalysisSetting.isLoading
    ? 'loading'
    : alertAnalysisSetting.error || !alertAnalysisSetting.data
    ? 'unknown'
    : (alertAnalysisSetting.data.settings[SECURITY_SOLUTION_ALERT_ANALYSIS_WORKFLOW_ENABLED]
        ?.userValue ??
        uiSettings.getAll()[SECURITY_SOLUTION_ALERT_ANALYSIS_WORKFLOW_ENABLED]?.value) === true
    ? 'satisfied'
    : 'missing';
  const alertAnalysisStatus: DependencyStatus =
    alertAnalysisWorkflowStatus === 'missing' || alertAnalysisRuntimeStatus === 'missing'
      ? 'missing'
      : alertAnalysisWorkflowStatus === 'unknown' || alertAnalysisRuntimeStatus === 'unknown'
      ? 'unknown'
      : alertAnalysisWorkflowStatus === 'loading' || alertAnalysisRuntimeStatus === 'loading'
      ? 'loading'
      : 'satisfied';

  return {
    alertAnalysis: alertAnalysisStatus,
    alertAnalysisWorkflow: alertAnalysisWorkflowStatus,
    contextEngine: needsContextEngine && !contextEngineEnabled ? 'missing' : 'satisfied',
    attackDiscoveryWorkflows:
      workerId === SYSTEM_SECURITY_WORKER_FLOOR_ATTACK_DISCOVERY_ID &&
      !attackDiscoveryWorkflowsEnabled
        ? 'missing'
        : 'satisfied',
    attackDiscoveryFeatureAvailable,
    defend: defendStatus,
    threatIngest: workflowStatus(THREAT_REPORT_WORKFLOWS[0].id),
    threatEnrich: workflowStatus(THREAT_REPORT_WORKFLOWS[1].id),
    retry: () => {
      if (needsAlertAnalysis) void alertAnalysisSetting.refetch();
      if (needsAlertAnalysis) void alertAnalysisWorkflow.refetch();
      if (needsDefend) void defendPolicies.refetch();
      if (needsThreatReports) void threatReportWorkflows.refetch();
    },
  } as const;
};
