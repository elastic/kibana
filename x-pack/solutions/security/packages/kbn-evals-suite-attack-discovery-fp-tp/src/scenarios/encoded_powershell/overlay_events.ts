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
 * malicious-c2…"). Process, network, and file messages are rebuilt from the overlaid fields in
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
  if (hasCategory(event.source, 'file')) {
    const file = asRecord(event.source.file);
    return {
      ...event,
      source: { ...event.source, message: `${process.name} created ${file.path}` },
    };
  }
  return event;
};

const FP_STEP3_SCRIPT = 'C:\\Windows\\CCM\\SystemTemp\\ComplianceScript.ps1';

/** FP command lines for the steps whose TP command lines are persistence and lateral movement. */
const FP_COMMAND_LINES: ReadonlyArray<{ step: 3 | 4; commandLine: string }> = [
  {
    step: 3,
    commandLine: `powershell.exe -NoProfile -ExecutionPolicy Bypass -File ${FP_STEP3_SCRIPT}`,
  },
  {
    step: 4,
    commandLine:
      'powershell.exe Copy-Item \\\\sccm-dp-02.contoso.local\\SMS_DP$\\Content\\CM100023 C:\\Windows\\ccmcache\\1a',
  },
];

const withCommandLine = (event: Ad2IndexedRawEvent, commandLine: string): Ad2IndexedRawEvent => {
  const args = commandLine.split(/\s+/).filter(Boolean);
  return {
    ...event,
    source: {
      ...event.source,
      process: {
        ...asRecord(event.source.process),
        command_line: commandLine,
        args,
        args_count: args.length,
      },
    },
  };
};

const withFilePath = (event: Ad2IndexedRawEvent, path: string): Ad2IndexedRawEvent => ({
  ...event,
  source: {
    ...event.source,
    file: { ...asRecord(event.source.file), path, name: path.split('\\').pop() },
  },
});

const stepEventIds = (ids: EncodedPowershellIds, step: 3 | 4): readonly string[] =>
  step === 3 ? [ids.process3Id, ids.file3Id] : [ids.process4Id, ids.network4Id];

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
    if (variant === 'fp') {
      const override = FP_COMMAND_LINES.find(({ step }) =>
        stepEventIds(ids, step).includes(event.id)
      );
      if (override) {
        next = withCommandLine(next, override.commandLine);
      }
      if (event.id === ids.file3Id) {
        next = withFilePath(next, FP_STEP3_SCRIPT);
      }
    }
    return withFieldMessage(next);
  });
