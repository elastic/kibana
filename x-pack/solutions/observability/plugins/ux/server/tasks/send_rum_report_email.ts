/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { KibanaRequest, Logger } from '@kbn/core/server';
import { NOTIFICATIONS_REQUESTER_ID } from '@kbn/actions-plugin/server';
import type { PluginStartContract as ActionsStart } from '@kbn/actions-plugin/server';
import type { CoreStart } from '@kbn/core/server';
import {
  csvFilename,
  reportEmailHtml,
  reportEmailMarkdown,
  resolveEmailReportRange,
} from '../../common/rum_report';
import { buildReportPdfBuffer, textToPdfBuffer } from '../../common/rum_report_pdf';
import {
  RUM_REPORT_SCHEDULE_SO_TYPE,
  type RumReportScheduleAttributes,
} from '../../common/rum_report_schedule';
import { buildRumReport } from '../routes/rum/reports';
import type { UxRouteHandlerResources } from '../routes/types';
import { generateRumReportNarrative } from './generate_rum_report_narrative';

const queryFromSchedule = (
  schedule: RumReportScheduleAttributes,
  rangeFrom: string,
  rangeTo: string,
  compare: string
) => {
  const { filters } = schedule;
  return {
    rangeFrom,
    rangeTo,
    compare,
    includePii: filters.includePii ? 'true' : undefined,
    serviceName: filters.serviceName,
    browser: filters.browser,
    os: filters.os,
    location: filters.location,
    pageUrl: filters.pageUrl,
    frustration: filters.frustration,
    user: filters.user,
    includeBots: filters.includeBots,
    kuery: filters.kuery,
    breakpoint: filters.breakpoint,
    connection: filters.connection,
    device: filters.device,
    errorGroup: filters.errorGroup,
  };
};

const firstHeader = (value: string | string[] | undefined): string | undefined =>
  Array.isArray(value) ? value[0] : value;

const kibanaOrigin = (coreStart: CoreStart, request: KibanaRequest): string => {
  const publicUrl = coreStart.http.basePath.publicBaseUrl;
  const serverBasePath = coreStart.http.basePath.serverBasePath;
  if (publicUrl) {
    const trimmed = publicUrl.replace(/\/$/, '');
    if (serverBasePath && trimmed.endsWith(serverBasePath)) {
      return trimmed.slice(0, -serverBasePath.length) || trimmed;
    }
    return trimmed;
  }
  const host =
    firstHeader(request.headers['x-forwarded-host']) ?? firstHeader(request.headers.host);
  const proto =
    firstHeader(request.headers['x-forwarded-proto']) ?? coreStart.http.getServerInfo().protocol;
  if (host) {
    return `${proto}://${host.split(',')[0].trim()}`;
  }
  const info = coreStart.http.getServerInfo();
  return `${info.protocol}://${info.hostname}:${info.port}`;
};

const shareUrlFor = (
  coreStart: CoreStart,
  request: KibanaRequest,
  schedule: RumReportScheduleAttributes,
  rangeFrom: string,
  rangeTo: string,
  compare: string
): string => {
  const params = new URLSearchParams();
  params.set('rangeFrom', rangeFrom);
  params.set('rangeTo', rangeTo);
  params.set('compare', compare);
  const { filters } = schedule;
  if (filters.serviceName) params.set('serviceName', filters.serviceName);
  if (filters.location) params.set('location', filters.location);
  if (filters.kuery) params.set('kuery', filters.kuery);
  if (filters.browser) params.set('browser', filters.browser);
  if (filters.os) params.set('os', filters.os);
  if (filters.includePii) params.set('includePii', 'true');
  const path = coreStart.http.basePath.prepend(`/app/ux/reports/${schedule.templateId}`);
  return `${kibanaOrigin(coreStart, request)}${path}?${params.toString()}`;
};

export const sendRumReportEmail = async ({
  actions,
  coreStart,
  logger,
  resources,
  schedule,
  scheduleId,
  spaceId,
  rangeFrom: rangeFromOverride,
  rangeTo: rangeToOverride,
  compare: compareOverride,
}: {
  actions: ActionsStart;
  coreStart: CoreStart;
  logger: Logger;
  resources: UxRouteHandlerResources;
  schedule: RumReportScheduleAttributes;
  scheduleId?: string;
  spaceId: string;
  rangeFrom?: string;
  rangeTo?: string;
  compare?: string;
}): Promise<void> => {
  const { rangeFrom, rangeTo } = resolveEmailReportRange(schedule.cadence, {
    rangeFrom: rangeFromOverride,
    rangeTo: rangeToOverride,
  });
  const compare = compareOverride === 'none' ? 'none' : 'previous';
  const report = await buildRumReport(
    schedule.templateId,
    resources,
    queryFromSchedule(schedule, rangeFrom, rangeTo, compare)
  );
  const shareUrl = shareUrlFor(coreStart, resources.request, schedule, rangeFrom, rangeTo, compare);
  let narrative: string | undefined;
  if (schedule.includeAi) {
    const plugins = await resources.startPlugins();
    if (!plugins.inference) {
      throw new Error('AI summary requires the inference plugin');
    }
    narrative = await generateRumReportNarrative({
      inference: plugins.inference,
      request: resources.request,
      report,
      connectorId: schedule.inferenceConnectorId,
    });
  }
  const markdown = reportEmailMarkdown(report, shareUrl, narrative);
  const html = reportEmailHtml(report, shareUrl, narrative);
  const pdf = await buildReportPdfBuffer(report, shareUrl, narrative);
  const filename = csvFilename(schedule.templateId, rangeFrom, rangeTo).replace(/\.csv$/i, '.pdf');

  const unsecured = actions.getUnsecuredActionsClient();
  const result = await unsecured.execute({
    requesterId: NOTIFICATIONS_REQUESTER_ID,
    id: schedule.connectorId,
    spaceId,
    params: {
      to: schedule.to,
      subject: `${report.title} (${rangeFrom.slice(0, 10)} - ${rangeTo.slice(0, 10)})`,
      message: markdown,
      messageHTML: html,
      attachments: [
        {
          content: pdf.toString('base64'),
          contentType: 'application/pdf',
          filename,
          encoding: 'base64',
        },
      ],
    },
    relatedSavedObjects: scheduleId
      ? [{ id: scheduleId, type: RUM_REPORT_SCHEDULE_SO_TYPE, typeId: RUM_REPORT_SCHEDULE_SO_TYPE }]
      : undefined,
  });

  if (result.status === 'error') {
    throw new Error(result.message ?? 'Email connector failed');
  }

  logger.info(
    `Sent UX report email${scheduleId ? ` for schedule ${scheduleId}` : ''} via ${
      schedule.connectorId
    }`
  );
};

export const sendRumReportEmailTest = async ({
  actions,
  connectorId,
  spaceId,
  to,
}: {
  actions: ActionsStart;
  connectorId: string;
  spaceId: string;
  to: string[];
}): Promise<void> => {
  const markdown =
    'UX report email connector test.\n\nIf you received this, the connector can send markdown and a PDF attachment.';
  const pdf = textToPdfBuffer(markdown);
  const unsecured = actions.getUnsecuredActionsClient();
  const result = await unsecured.execute({
    requesterId: NOTIFICATIONS_REQUESTER_ID,
    id: connectorId,
    spaceId,
    params: {
      to,
      subject: 'UX report email test',
      message: markdown,
      attachments: [
        {
          content: pdf.toString('base64'),
          contentType: 'application/pdf',
          filename: 'ux-report-test.pdf',
          encoding: 'base64',
        },
      ],
    },
  });

  if (result.status === 'error') {
    throw new Error(result.message ?? 'Email connector failed');
  }
};
