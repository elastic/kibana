/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';
import {
  SYSTEM_SECURITY_WORKER_DETECTION_RULE_COVERAGE_ID,
  SYSTEM_SECURITY_WORKER_FLOOR_ATTACK_DISCOVERY_ID,
  SYSTEM_SECURITY_WORKER_FORENSICS_ENDPOINT_ANALYSIS_ID,
  SYSTEM_SECURITY_WORKER_HUNT_CONTINUOUS_THREAT_HUNT_ID,
} from '@kbn/alertzero-common';
import type { Worker } from '@kbn/alertzero-common';
import type { WorkerWarningReason } from '../components/worker_warning_content';
import { getBlockingWarningReasons } from '../components/blocking_warning_reasons';
import { workerName } from '../workers/translations';
import * as i18nShared from './translations';

interface WorkerDependencyNames {
  providerName: string;
  dependentName: string;
}

const strong = (chunks: React.ReactNode) => <strong>{chunks}</strong>;

/**
 * While the provider Worker is off, the dependent Worker loses some or all of its work. Each
 * entry's copy names only what is lost, since the dependent may still do the rest of its job.
 */
export interface WorkerDependency {
  providerId: string;
  dependentId: string;
  disableBody: (names: WorkerDependencyNames) => React.ReactNode;
  providerHeaderReason: (names: WorkerDependencyNames) => string;
  dependentHeaderReason: (names: WorkerDependencyNames) => string;
}

export const WORKER_DEPENDENCIES: readonly WorkerDependency[] = [
  {
    // Hunt is the only writer of the `security.coverage` records Rule Coverage works on.
    providerId: SYSTEM_SECURITY_WORKER_HUNT_CONTINUOUS_THREAT_HUNT_ID,
    dependentId: SYSTEM_SECURITY_WORKER_DETECTION_RULE_COVERAGE_ID,
    disableBody: ({ providerName, dependentName }) => (
      <FormattedMessage
        id="xpack.alertzero.watches.workerDependencies.huntToRuleCoverage.disableBody"
        defaultMessage="<strong>{dependentName}</strong> is enabled and depends on this Worker's findings. While {providerName} is off, {dependentName} has no gap signals to act on."
        values={{ providerName, dependentName, strong }}
      />
    ),
    providerHeaderReason: ({ dependentName }) =>
      i18n.translate(
        'xpack.alertzero.watches.workerDependencies.huntToRuleCoverage.providerReason',
        {
          defaultMessage:
            '{dependentName} is enabled but has no gap signals while this Worker is off.',
          values: { dependentName },
        }
      ),
    dependentHeaderReason: ({ providerName }) =>
      i18n.translate(
        'xpack.alertzero.watches.workerDependencies.huntToRuleCoverage.dependentReason',
        {
          defaultMessage: '{providerName} is disabled — no gap signals to act on.',
          values: { providerName },
        }
      ),
  },
  {
    // Attack Discovery's forensics handoff is the only writer of `security.analyze_endpoint` records.
    providerId: SYSTEM_SECURITY_WORKER_FLOOR_ATTACK_DISCOVERY_ID,
    dependentId: SYSTEM_SECURITY_WORKER_FORENSICS_ENDPOINT_ANALYSIS_ID,
    disableBody: ({ providerName, dependentName }) => (
      <FormattedMessage
        id="xpack.alertzero.watches.workerDependencies.attackDiscoveryToEndpointAnalysis.disableBody"
        defaultMessage="<strong>{dependentName}</strong> is enabled and only analyzes attacks this Worker hands off. While {providerName} is off, {dependentName} has nothing to analyze."
        values={{ providerName, dependentName, strong }}
      />
    ),
    providerHeaderReason: ({ dependentName }) =>
      i18n.translate(
        'xpack.alertzero.watches.workerDependencies.attackDiscoveryToEndpointAnalysis.providerReason',
        {
          defaultMessage:
            '{dependentName} is enabled but has nothing to analyze while this Worker is off.',
          values: { dependentName },
        }
      ),
    dependentHeaderReason: ({ providerName }) =>
      i18n.translate(
        'xpack.alertzero.watches.workerDependencies.attackDiscoveryToEndpointAnalysis.dependentReason',
        {
          defaultMessage: '{providerName} is disabled — no attacks are handed off for analysis.',
          values: { providerName },
        }
      ),
  },
  {
    // Endpoint Analysis is the only reader of the `security.analyze_endpoint` records Attack
    // Discovery's forensics handoff writes. False positives still close without it.
    providerId: SYSTEM_SECURITY_WORKER_FORENSICS_ENDPOINT_ANALYSIS_ID,
    dependentId: SYSTEM_SECURITY_WORKER_FLOOR_ATTACK_DISCOVERY_ID,
    disableBody: ({ providerName, dependentName }) => (
      <FormattedMessage
        id="xpack.alertzero.watches.workerDependencies.endpointAnalysisToAttackDiscovery.disableBody"
        defaultMessage="<strong>{dependentName}</strong> is enabled and hands attacks it can't rule out as false positives to this Worker. While {providerName} is off, those handoffs aren't analyzed and their Investigations stay open."
        values={{ providerName, dependentName, strong }}
      />
    ),
    providerHeaderReason: ({ dependentName }) =>
      i18n.translate(
        'xpack.alertzero.watches.workerDependencies.endpointAnalysisToAttackDiscovery.providerReason',
        {
          defaultMessage:
            "{dependentName} is enabled but its handoffs aren't analyzed while this Worker is off.",
          values: { dependentName },
        }
      ),
    dependentHeaderReason: ({ providerName }) =>
      i18n.translate(
        'xpack.alertzero.watches.workerDependencies.endpointAnalysisToAttackDiscovery.dependentReason',
        {
          defaultMessage:
            "{providerName} is disabled — attacks handed off for analysis aren't analyzed.",
          values: { providerName },
        }
      ),
  },
];

export type WorkerEnabledById = ReadonlyMap<string, boolean>;

export interface WorkerDependencyMessage {
  id: string;
  message: React.ReactNode;
}

export interface WorkerDisableConfirmation {
  title: string;
  paragraphs: WorkerDependencyMessage[];
}

export interface WorkerBlockedNotice {
  workerId: string;
  reasons: WorkerWarningReason[];
}

const dependencyNames = (dependency: WorkerDependency): WorkerDependencyNames => ({
  providerName: workerName(dependency.providerId),
  dependentName: workerName(dependency.dependentId),
});

export const getDisableConfirmation = (
  workerId: string,
  enabledById: WorkerEnabledById
): WorkerDisableConfirmation | undefined => {
  const affected = WORKER_DEPENDENCIES.filter(
    (dependency) =>
      dependency.providerId === workerId && enabledById.get(dependency.dependentId) === true
  );
  if (affected.length === 0) {
    return undefined;
  }
  return {
    title: i18nShared.disableWorkerTitle(workerName(workerId)),
    paragraphs: affected.map((dependency) => ({
      id: dependency.dependentId,
      message: dependency.disableBody(dependencyNames(dependency)),
    })),
  };
};

const getDisabledProviderReasons = (
  workerId: string,
  enabledById: WorkerEnabledById
): WorkerWarningReason[] =>
  WORKER_DEPENDENCIES.filter(
    (dependency) =>
      dependency.dependentId === workerId && enabledById.get(dependency.providerId) === false
  ).map((dependency) => ({
    id: `blockedBy:${dependency.providerId}`,
    message: dependency.dependentHeaderReason(dependencyNames(dependency)),
  }));

const getStrandedDependentReasons = (
  workerId: string,
  enabledById: WorkerEnabledById
): WorkerWarningReason[] =>
  WORKER_DEPENDENCIES.filter(
    (dependency) =>
      dependency.providerId === workerId &&
      enabledById.get(workerId) === false &&
      enabledById.get(dependency.dependentId) === true
  ).map((dependency) => ({
    id: `blocking:${dependency.dependentId}`,
    message: dependency.providerHeaderReason(dependencyNames(dependency)),
  }));

/**
 * Every warning for a Worker's header, the no-model reason first because it stops the Worker outright.
 * Leave `includeBlocking` off for users who can't change Workers: the model check runs as the
 * requesting user, so without connector access it reports no model in a space that has one.
 */
export const getWorkerWarningReasons = (
  worker: Pick<Worker, 'id' | 'blockingReasons'>,
  enabledById: WorkerEnabledById,
  { includeBlocking }: { includeBlocking: boolean }
): WorkerWarningReason[] => [
  ...(includeBlocking ? getBlockingWarningReasons(worker, { withLink: false }) : []),
  ...getDisabledProviderReasons(worker.id, enabledById),
  ...getStrandedDependentReasons(worker.id, enabledById),
];

/**
 * Notices for saved Workers that are on after the save but can't do their work. A missing model
 * is reported after every such save; a disabled provider only after the save that turned the
 * Worker on.
 */
export const getBlockedAfterSaveNotices = (
  enabledBeforeSave: WorkerEnabledById,
  enabledAfterSave: WorkerEnabledById,
  savedWorkers: ReadonlyArray<Pick<Worker, 'id' | 'enabled' | 'blockingReasons'>>
): WorkerBlockedNotice[] =>
  savedWorkers
    .map((worker) => ({
      workerId: worker.id,
      reasons: [
        ...(worker.enabled ? getBlockingWarningReasons(worker, { withLink: true }) : []),
        ...(enabledBeforeSave.get(worker.id) === false && enabledAfterSave.get(worker.id) === true
          ? getDisabledProviderReasons(worker.id, enabledAfterSave)
          : []),
      ],
    }))
    .filter((notice) => notice.reasons.length > 0);
