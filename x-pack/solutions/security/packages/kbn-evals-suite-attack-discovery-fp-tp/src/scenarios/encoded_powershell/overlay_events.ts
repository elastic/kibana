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

const asRecord = (value: unknown): Record<string, unknown> =>
  typeof value === 'object' && value !== null ? (value as Record<string, unknown>) : {};

const hasCategory = (source: Record<string, unknown>, category: string): boolean => {
  const categories = asRecord(source.event).category;
  return Array.isArray(categories) && categories.includes(category);
};

/**
 * The registry's `message` narrates the TP chain ("WINWORD.EXE spawned…", "connected to
 * malicious-c2…"). Process and network messages are rebuilt from the overlaid fields in
 * both twins, so the text matches the fields and does not differ in style between twins.
 */
const withFieldMessage = (event: Ad2IndexedRawEvent): Ad2IndexedRawEvent => {
  const process = asRecord(event.source.process);
  const parent = asRecord(process.parent);
  const destination = asRecord(event.source.destination);
  if (hasCategory(event.source, 'network')) {
    return {
      ...event,
      source: {
        ...event.source,
        message: `${process.name} connected to ${destination.domain} (${destination.ip}:${destination.port})`,
      },
    };
  }
  if (hasCategory(event.source, 'process')) {
    return {
      ...event,
      source: { ...event.source, message: `${parent.name} started ${process.name}` },
    };
  }
  return event;
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
    // Step 1 is the only step whose events are the Office child itself.
    const tpParent = event.id === ids.process1Id ? TP_WINWORD_PARENT : TP_POWERSHELL_PARENT;
    let next = withProcessParent(event, variant === 'tp' ? tpParent : FP_CCMEXEC_PARENT);
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
    return withFieldMessage(next);
  });
