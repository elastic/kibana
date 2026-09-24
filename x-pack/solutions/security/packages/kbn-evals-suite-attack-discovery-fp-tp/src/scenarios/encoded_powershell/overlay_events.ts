/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Ad2IndexedRawEvent } from '@kbn/evals-suite-attack-discovery-agent-builder';
import type { EncodedPowershellIds } from './ids';

const TP_WINWORD_PARENT = {
  name: 'WINWORD.EXE',
  pid: 3124,
  executable: 'C:\\Program Files\\Microsoft Office\\root\\Office16\\WINWORD.EXE',
  code_signature: { status: 'trusted', subject_name: 'Microsoft Corporation' },
};

const TP_POWERSHELL_PARENT = {
  name: 'powershell.exe',
  pid: 4001,
  executable: 'C:\\Windows\\System32\\WindowsPowerShell\\v1.0\\powershell.exe',
};

const FP_CCMEXEC_PARENT = {
  name: 'ccmexec.exe',
  pid: 2188,
  executable: 'C:\\Windows\\CCM\\ccmexec.exe',
  code_signature: { status: 'trusted', subject_name: 'Microsoft Windows' },
};

const withTwinLabel = (
  source: Record<string, unknown>,
  variant: 'tp' | 'fp'
): Record<string, unknown> => {
  const labels =
    typeof source.labels === 'object' && source.labels !== null
      ? (source.labels as Record<string, unknown>)
      : {};
  return {
    ...source,
    labels: {
      ...labels,
      ad_fp_tp_twin: `encoded-powershell.${variant}`,
    },
  };
};

const withProcessParent = (
  event: Ad2IndexedRawEvent,
  parent: Record<string, unknown>
): Ad2IndexedRawEvent => {
  const process =
    typeof event.source.process === 'object' && event.source.process !== null
      ? (event.source.process as Record<string, unknown>)
      : undefined;
  if (process === undefined) {
    return event;
  }
  return {
    ...event,
    source: {
      ...event.source,
      process: { ...process, parent },
    },
  };
};

const withDestination = (
  event: Ad2IndexedRawEvent,
  destination: Record<string, unknown>
): Ad2IndexedRawEvent => ({
  ...event,
  source: {
    ...event.source,
    destination: {
      ...(typeof event.source.destination === 'object' && event.source.destination !== null
        ? (event.source.destination as Record<string, unknown>)
        : {}),
      ...destination,
    },
  },
});

export const overlayEncodedPowershellEvents = (
  events: readonly Ad2IndexedRawEvent[],
  variant: 'tp' | 'fp',
  ids: EncodedPowershellIds
): Ad2IndexedRawEvent[] =>
  events.map((event) => {
    let next: Ad2IndexedRawEvent = {
      ...event,
      source: withTwinLabel(event.source, variant),
    };
    // Step 1 is the only step whose events are the Office child itself.
    const tpParent = event.id === ids.process1Id ? TP_WINWORD_PARENT : TP_POWERSHELL_PARENT;
    next = withProcessParent(next, variant === 'tp' ? tpParent : FP_CCMEXEC_PARENT);
    if (variant === 'fp' && event.id === ids.network2Id) {
      next = withDestination(next, {
        domain: 'manage.microsoft.com',
        ip: '20.190.128.10',
        port: 443,
      });
    }
    if (variant === 'fp' && event.id === ids.network4Id) {
      next = withDestination(next, {
        domain: 'sccm-dp-02.contoso.local',
        ip: '10.50.10.20',
        port: 445,
      });
    }
    return next;
  });
