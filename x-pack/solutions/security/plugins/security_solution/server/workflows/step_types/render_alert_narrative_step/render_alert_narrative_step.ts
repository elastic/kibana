/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z } from '@kbn/zod/v4';
import { createServerStepDefinition } from '@kbn/workflows-extensions/server';
import { get } from 'lodash/fp';
import type { ElasticsearchClient } from '@kbn/core-elasticsearch-server';

type Source = Record<string, unknown>;

const inputSchema = z.object({
  alertId: z.string().describe('The alert ID'),
  alertIndex: z.string().describe('The index that contains the alert'),
});

const outputSchema = z.object({
  alert_id: z.string(),
  alert_index: z.string(),
  timeline_string: z.string(),
  message: z.string(),
});

const SOURCE_INCLUDES = [
  'event.category',
  'event.action',
  'event.outcome',
  'process.name',
  'process.pid',
  'process.args',
  'process.title',
  'process.working_directory',
  'process.exit_code',
  'process.ppid',
  'process.executable',
  'process.hash.sha256',
  'process.parent.name',
  'process.parent.pid',
  'file.name',
  'source.ip',
  'source.port',
  'destination.ip',
  'destination.port',
  'user.name',
  'user.domain',
  'host.name',
  'kibana.alert.severity',
  'kibana.alert.rule.name',
  'message',
] as const;

const toStringArray = (value: unknown): string[] | undefined => {
  if (value == null) return undefined;

  if (Array.isArray(value)) {
    const out = value
      .map((x) => (x == null ? '' : String(x)))
      .map((x) => x.trim())
      .filter((x) => x.length > 0);
    return out.length ? out : undefined;
  }

  const asString = String(value).trim();
  return asString.length ? [asString] : undefined;
};

const getValues = (source: Source, field: string): string[] | undefined =>
  toStringArray(get(field, source));

const joinValues = (values: string[] | undefined): string | undefined =>
  values != null && values.length ? values.join(', ') : undefined;

const shouldShowWith = (source: Source): boolean =>
  [
    'destination.ip',
    'destination.port',
    'file.name',
    'process.name',
    'process.parent.name',
    'source.ip',
    'source.port',
  ].some((field) => (getValues(source, field)?.length ?? 0) > 0);

/**
 * Generates a Timeline-like English string similar to the Timeline alert row renderer.
 * This is intentionally "plain English" (no i18n), as it is used in workflows.
 */
export const buildAlertTimelineString = (source: Source): string => {
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

  // Normalize spacing after punctuation that we intentionally omit a trailing space for (commas).
  return text.replace(/,\s*/g, ', ').replace(/\s+/g, ' ').trim();
};

const normalizeSpaces = (text: string): string =>
  text
    .replace(/,\s*/g, ', ')
    .replace(/\s+([,.:;])/g, '$1')
    .replace(/\s+/g, ' ')
    .trim();

const getSingleValue = (source: Source, field: string): string | undefined =>
  joinValues(getValues(source, field));

const getNumberValue = (source: Source, field: string): number | undefined => {
  const v = get(field, source);
  if (v == null) return undefined;
  if (Array.isArray(v)) {
    const first = v[0];
    const asNumber = typeof first === 'number' ? first : Number(first);
    return Number.isFinite(asNumber) ? asNumber : undefined;
  }
  const asNumber = typeof v === 'number' ? v : Number(v);
  return Number.isFinite(asNumber) ? asNumber : undefined;
};

const getArgs = (source: Source): string[] | undefined => {
  const raw = get('process.args', source);
  const values = toStringArray(raw);
  return values?.length ? values : undefined;
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

/**
 * Generates a Timeline-like English string similar to the Timeline system/endpoint process row renderer.
 * (user@host in cwd) + (action text) + process(pid) + args/title + exit code + parent + outcome + sha256
 */
export const buildProcessTimelineString = (source: Source): string => {
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

  // If we have none of the core process-ish fields, return empty so the caller can omit this segment.
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

export const buildCombinedTimelineString = (source: Source): string => {
  const alertPart = normalizeSpaces(buildAlertTimelineString(source));
  const processPart = buildProcessTimelineString(source);

  if (processPart.length && alertPart.length) {
    return normalizeSpaces(`${alertPart} ${processPart}`);
  }

  return processPart.length ? processPart : alertPart;
};

const getAlertSource = async ({
  esClient,
  alertIndex,
  alertId,
}: {
  esClient: ElasticsearchClient;
  alertIndex: string;
  alertId: string;
}): Promise<Source> => {
  const response = await esClient.get<Source>({
    index: alertIndex,
    id: alertId,
    _source_includes: [...SOURCE_INCLUDES],
  });

  return (response as { _source?: Source })._source ?? {};
};

export const renderAlertNarrativeStepDefinition = createServerStepDefinition({
  id: 'security.renderAlertNarrative',
  inputSchema,
  outputSchema,
  handler: async (context) => {
    try {
      const { alertId, alertIndex } = context.input;
      const esClient = context.contextManager.getScopedEsClient();

      const source = await getAlertSource({ esClient, alertId, alertIndex });
      const timelineString = buildCombinedTimelineString(source);

      return {
        output: {
          alert_id: alertId,
          alert_index: alertIndex,
          timeline_string: timelineString,
          message: `Generated a Timeline-like string for alert ${alertId}.`,
        },
      };
    } catch (error) {
      context.logger.error('Failed to generate alert timeline string', error);
      return {
        error: new Error(
          error instanceof Error ? error.message : 'Failed to generate alert timeline string'
        ),
      };
    }
  },
});
