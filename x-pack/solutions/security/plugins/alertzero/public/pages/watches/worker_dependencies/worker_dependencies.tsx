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
  SYSTEM_SECURITY_WORKER_DETECTION_RULE_CREATION_ID,
  SYSTEM_SECURITY_WORKER_FLOOR_ATTACK_DISCOVERY_ID,
  SYSTEM_SECURITY_WORKER_FORENSICS_ENDPOINT_ANALYSIS_ID,
  SYSTEM_SECURITY_WORKER_HUNT_CONTINUOUS_THREAT_HUNT_ID,
} from '@kbn/alertzero-common';
import type { WorkerWarningReason } from '../components/worker_warning_content';
import { workerName } from '../workers/translations';
import * as i18nShared from './translations';

interface WorkerDependencyNames {
  providerName: string;
  dependentName: string;
}

const strong = (chunks: React.ReactNode) => <strong>{chunks}</strong>;

/**
 * A hard dependency: the dependent Worker only acts on records the provider writes, so while the
 * provider is off the dependent has nothing to do. Soft ("fewer inputs") dependencies do not
 * belong here.
 */
export interface WorkerDependency {
  providerId: string;
  dependentId: string;
  /** Disable-dialog body shown when turning the provider off while the dependent is enabled. */
  disableBody: (names: WorkerDependencyNames) => React.ReactNode;
  /** Provider header, while the provider is off and the dependent is enabled. */
  providerReason: (names: WorkerDependencyNames) => string;
  /** Dependent header, while the provider is off. */
  dependentReason: (names: WorkerDependencyNames) => string;
}

export const WORKER_DEPENDENCIES: readonly WorkerDependency[] = [
  {
    // Hunt is the only writer of the `security.coverage` records Rule Coverage works on. Rule
    // Coverage's id and name still read "Rule Creation" until that Worker is renamed.
    providerId: SYSTEM_SECURITY_WORKER_HUNT_CONTINUOUS_THREAT_HUNT_ID,
    dependentId: SYSTEM_SECURITY_WORKER_DETECTION_RULE_CREATION_ID,
    disableBody: ({ providerName, dependentName }) => (
      <FormattedMessage
        id="xpack.alertzero.watches.workerDependencies.huntToRuleCoverage.disableBody"
        defaultMessage="<strong>{dependentName}</strong> is enabled and depends on this Worker's findings. While {providerName} is off, {dependentName} has no gap signals to act on."
        values={{ providerName, dependentName, strong }}
      />
    ),
    providerReason: ({ dependentName }) =>
      i18n.translate(
        'xpack.alertzero.watches.workerDependencies.huntToRuleCoverage.providerReason',
        {
          defaultMessage:
            '{dependentName} is enabled but has no gap signals while this Worker is off.',
          values: { dependentName },
        }
      ),
    dependentReason: ({ providerName }) =>
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
    providerReason: ({ dependentName }) =>
      i18n.translate(
        'xpack.alertzero.watches.workerDependencies.attackDiscoveryToEndpointAnalysis.providerReason',
        {
          defaultMessage:
            '{dependentName} is enabled but has nothing to analyze while this Worker is off.',
          values: { dependentName },
        }
      ),
    dependentReason: ({ providerName }) =>
      i18n.translate(
        'xpack.alertzero.watches.workerDependencies.attackDiscoveryToEndpointAnalysis.dependentReason',
        {
          defaultMessage: '{providerName} is disabled — no attacks are handed off for analysis.',
          values: { providerName },
        }
      ),
  },
];

/**
 * Enabled state of every Worker the list returned, across all Watches. A Worker missing from the
 * map is either not registered or hidden by its skill gate; no dependency involving it applies.
 */
export type WorkerEnabledById = ReadonlyMap<string, boolean>;

/** One paragraph of the disable dialog, one per enabled dependent. */
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

/**
 * The dialog to show before turning `workerId` off, or `undefined` when no enabled Worker depends
 * on it. Turning a Worker on never needs one, so callers only ask on the way off.
 */
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

/**
 * Everything the Worker's header warning icon explains, most serious first: reasons this Worker
 * has nothing to do come before the impact its being off has on others.
 */
export const getWorkerWarningReasons = (
  workerId: string,
  enabledById: WorkerEnabledById
): WorkerWarningReason[] => {
  const reasons: WorkerWarningReason[] = [];

  for (const dependency of WORKER_DEPENDENCIES) {
    if (dependency.dependentId === workerId && enabledById.get(dependency.providerId) === false) {
      reasons.push({
        id: `blockedBy:${dependency.providerId}`,
        message: dependency.dependentReason(dependencyNames(dependency)),
      });
    }
  }

  for (const dependency of WORKER_DEPENDENCIES) {
    if (
      dependency.providerId === workerId &&
      enabledById.get(workerId) === false &&
      enabledById.get(dependency.dependentId) === true
    ) {
      reasons.push({
        id: `blocking:${dependency.dependentId}`,
        message: dependency.providerReason(dependencyNames(dependency)),
      });
    }
  }

  return reasons;
};

/**
 * Post-save notices for the Workers the save just turned on that still can't do anything. A
 * settings-only save of an already enabled Worker gets none; its header icon already says it. A
 * Worker saved as off gets none either: the disable dialog already confirmed that, and the Worker
 * that actually loses its input keeps its header icon. Being on is also what keeps the "blocking"
 * reasons out, since they only arise while this Worker is off; a new reason kind must hold the
 * same property or be filtered here.
 */
export const getBlockedAfterSaveNotices = (
  enabledBeforeSave: WorkerEnabledById,
  enabledAfterSave: WorkerEnabledById,
  savedWorkerIds: readonly string[]
): WorkerBlockedNotice[] =>
  savedWorkerIds
    .filter(
      (workerId) =>
        enabledBeforeSave.get(workerId) === false && enabledAfterSave.get(workerId) === true
    )
    .map((workerId) => ({
      workerId,
      reasons: getWorkerWarningReasons(workerId, enabledAfterSave),
    }))
    .filter((notice) => notice.reasons.length > 0);
