/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { NarrativeStrategy } from '../narrative_strategy';
import {
  getSingleValue,
  getValues,
  joinValues,
  getNumberValue,
  toStringArray,
  normalizeSpaces,
} from '../narrative_utils';
import type { AlertSource } from '../narrative_utils';

const shouldShowWith = (source: AlertSource): boolean =>
  [
    'destination.ip',
    'destination.port',
    'file.name',
    'process.name',
    'process.parent.name',
    'source.ip',
    'source.port',
  ].some((field) => (getValues(source, field)?.length ?? 0) > 0);

export const buildAlertTimelineString = (source: AlertSource): string => {
  const eventCategory = joinValues(getValues(source, 'event.category'));
  const processName = joinValues(getValues(source, 'process.name'));
  const processParentName = joinValues(getValues(source, 'process.parent.name'));
  const fileName = joinValues(getValues(source, 'file.name'));
  const sourceIp = joinValues(getValues(source, 'source.ip'));
  const sourcePort = joinValues(getValues(source, 'source.port'));
  const destinationIp = joinValues(getValues(source, 'destination.ip'));
  const destinationPort = joinValues(getValues(source, 'destination.port'));
  const userName = joinValues(getValues(source, 'user.name'));
  const hostName = joinValues(getValues(source, 'host.name'));
  const severity = joinValues(getValues(source, 'kibana.alert.severity'));
  const ruleName = joinValues(getValues(source, 'kibana.alert.rule.name'));

  let text = `${eventCategory ?? 'alert'} event`;

  if (shouldShowWith(source)) {
    text += ' with';
  }

  if (processName != null) text += ` process ${processName},`;
  if (processParentName != null) text += ` parent process ${processParentName},`;
  if (fileName != null) text += ` file ${fileName},`;

  if (sourceIp != null) text += ` source ${sourceIp}`;
  if (sourcePort != null) text += `:${sourcePort},`;

  if (destinationIp != null) text += ` destination ${destinationIp}`;
  if (destinationPort != null) text += `:${destinationPort},`;

  if (userName != null) text += ` by ${userName}`;
  if (hostName != null) text += ` on ${hostName}`;

  if (severity != null) {
    text += ` created ${severity} alert`;
    if (ruleName != null) {
      text += ` ${ruleName}.`;
    } else {
      text += '.';
    }
  } else if (ruleName != null) {
    text += ` ${ruleName}.`;
  }

  return text.replace(/,\s*/g, ', ').replace(/\s+/g, ' ').trim();
};

const getProcessActionText = (eventAction: string | undefined): string => {
  const action = (eventAction ?? '').toLowerCase();
  switch (action) {
    case 'fork':
      return 'forked process';
    case 'exec':
      return 'executed process';
    case 'start':
    case 'process_started':
    case 'creation_event':
    case 'creation':
      return 'started process';
    case 'end':
    case 'termination_event':
    case 'process_stopped':
    case 'deletion_event':
      return 'terminated process';
    default:
      return 'process';
  }
};

const getArgs = (source: AlertSource): string[] | undefined => {
  const raw = getValues(source, 'process.args');
  const values = toStringArray(raw);
  return values?.length ? values : undefined;
};

export const buildProcessTimelineString = (source: AlertSource): string => {
  const userName = getSingleValue(source, 'user.name');
  const userDomain = getSingleValue(source, 'user.domain');
  const hostName = getSingleValue(source, 'host.name');
  const workingDirectory = getSingleValue(source, 'process.working_directory');

  const eventAction = getSingleValue(source, 'event.action');
  const actionText = getProcessActionText(eventAction);

  const processName =
    getSingleValue(source, 'process.name') ?? getSingleValue(source, 'process.executable');
  const processPid = getNumberValue(source, 'process.pid');
  const args = getArgs(source);
  const processTitle = getSingleValue(source, 'process.title');

  const processExitCode = getNumberValue(source, 'process.exit_code');

  const parentName = getSingleValue(source, 'process.parent.name');
  const parentPid = getNumberValue(source, 'process.parent.pid');
  const ppid = getNumberValue(source, 'process.ppid');

  const outcome = getSingleValue(source, 'event.outcome');
  const processHashSha256 = getSingleValue(source, 'process.hash.sha256');

  const message = getSingleValue(source, 'message');

  const hasAnyProcessDetails =
    userName != null ||
    userDomain != null ||
    hostName != null ||
    workingDirectory != null ||
    processName != null ||
    processPid != null ||
    (args?.length ?? 0) > 0 ||
    processTitle != null ||
    processExitCode != null ||
    parentName != null ||
    parentPid != null ||
    ppid != null ||
    outcome != null ||
    processHashSha256 != null;

  if (!hasAnyProcessDetails) {
    return '';
  }

  let text = '';

  if (userName != null) text += userName;
  if (userDomain != null) text += `${userName != null ? '\\' : ''}${userDomain}`;
  if (hostName != null && userName != null) text += `@${hostName}`;
  else if (hostName != null) text += hostName;

  if (workingDirectory != null) {
    if (text.length) text += ' ';
    text += `in ${workingDirectory}`;
  }

  if (text.length) text += ' ';
  text += actionText;

  if (processName != null) {
    text += ` ${processName}`;
    if (processPid != null) {
      text += ` (${processPid})`;
    }
  } else if (processPid != null) {
    text += ` (${processPid})`;
  }

  if (args?.length) {
    text += ` ${args.join(' ')}`;
  }
  if (processTitle != null) {
    text += ` ${processTitle}`;
  }

  if (processExitCode != null) {
    text += ` with exit code ${processExitCode}`;
  }

  if (parentName != null || parentPid != null || ppid != null) {
    text += ' via parent process';
    if (parentName != null) text += ` ${parentName}`;
    if (parentPid != null) text += ` (${parentPid})`;
    if (ppid != null) text += ` (${ppid})`;
  }

  if (outcome != null) {
    text += ` with result ${outcome}`;
  }

  if (processHashSha256 != null) {
    text += ` ${processHashSha256}`;
  }

  if (message != null) {
    text += ` ${message}`;
  }

  return normalizeSpaces(text);
};

/**
 * The process/endpoint strategy is the default fallback.
 * It always matches but has the lowest priority.
 */
export const processStrategy: NarrativeStrategy = {
  id: 'process',
  priority: 0,
  match: () => true,
  build: (source) => {
    const alertPart = normalizeSpaces(buildAlertTimelineString(source));
    const processPart = buildProcessTimelineString(source);

    if (processPart.length && alertPart.length) {
      return normalizeSpaces(`${alertPart} ${processPart}`);
    }

    return processPart.length ? processPart : alertPart;
  },
};
