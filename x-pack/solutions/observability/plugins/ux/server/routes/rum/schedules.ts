/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import * as t from 'io-ts';
import { DEFAULT_SPACE_ID } from '@kbn/core-spaces-common';
import { isRumReportTemplateId } from '../../../common/rum_report';
import {
  isRumReportCadence,
  normalizeScheduleSpec,
  rumReportEmailTaskId,
  RUM_REPORT_EMAIL_TASK_TYPE,
  RUM_REPORT_SCHEDULE_SO_TYPE,
  type RumEmailConnectorOption,
  type RumReportSchedule,
  type RumReportScheduleAttributes,
} from '../../../common/rum_report_schedule';
import { createUxServerRoute } from '../create_ux_server_route';
import { boundedString } from './query';
import { cadenceToRrule } from '../../tasks/cadence_to_rrule';
import { sendRumReportEmail, sendRumReportEmailTest } from '../../tasks/send_rum_report_email';
import type { UxRouteHandlerResources } from '../types';

const EMAIL_ACTION_TYPE = '.email';

const filtersCodec = t.partial({
  serviceName: boundedString(256),
  browser: boundedString(128),
  os: boundedString(128),
  location: boundedString(8),
  pageUrl: boundedString(512),
  frustration: boundedString(32),
  user: boundedString(256),
  includeBots: boundedString(8),
  kuery: boundedString(4096),
  breakpoint: boundedString(32),
  connection: boundedString(64),
  device: boundedString(64),
  errorGroup: boundedString(256),
  includePii: t.boolean,
});

const scheduleFieldsCodec = t.partial({
  weekday: boundedString(2),
  monthday: t.number,
  hour: t.number,
  minute: t.number,
  tzid: boundedString(64),
});

const createBodyCodec = t.intersection([
  t.type({
    name: boundedString(200),
    cadence: boundedString(16),
    connectorId: boundedString(128),
    to: t.array(boundedString(256)),
    templateId: boundedString(32),
    filters: filtersCodec,
  }),
  scheduleFieldsCodec,
  t.partial({
    enabled: t.boolean,
    includeAi: t.boolean,
    inferenceConnectorId: boundedString(128),
  }),
]);

const updateBodyCodec = t.intersection([
  t.partial({
    name: boundedString(200),
    cadence: boundedString(16),
    connectorId: boundedString(128),
    to: t.array(boundedString(256)),
    enabled: t.boolean,
    includeAi: t.boolean,
    inferenceConnectorId: boundedString(128),
  }),
  scheduleFieldsCodec,
]);

const toSchedule = (id: string, attributes: RumReportScheduleAttributes): RumReportSchedule => ({
  id,
  ...attributes,
});

const spaceIdOf = async (resources: UxRouteHandlerResources): Promise<string> => {
  const plugins = await resources.startPlugins();
  return plugins.spaces?.spacesService.getSpaceId(resources.request) ?? DEFAULT_SPACE_ID;
};

const requireActionsAndTasks = async (resources: UxRouteHandlerResources) => {
  const plugins = await resources.startPlugins();
  const { actions, taskManager } = plugins;
  if (!actions || !taskManager) {
    throw new Error('Email scheduling requires the actions and taskManager plugins');
  }
  return { actions, taskManager, spaces: plugins.spaces };
};

const upsertTask = async (
  resources: UxRouteHandlerResources,
  scheduleId: string,
  attributes: RumReportScheduleAttributes,
  spaceId: string
) => {
  const { taskManager } = await requireActionsAndTasks(resources);
  await taskManager.ensureScheduled({
    id: rumReportEmailTaskId(scheduleId),
    taskType: RUM_REPORT_EMAIL_TASK_TYPE,
    schedule: cadenceToRrule(normalizeScheduleSpec(attributes)),
    params: { scheduleId, spaceId },
    state: {},
  });
};

export const listRumReportEmailConnectorsRoute = createUxServerRoute({
  endpoint: 'GET /internal/ux/rum/report_schedules/connectors',
  options: { access: 'internal' },
  security: { authz: { requiredPrivileges: ['apm'] } },
  handler: async (resources): Promise<{ connectors: RumEmailConnectorOption[] }> => {
    const plugins = await resources.startPlugins();
    if (!plugins.actions) {
      return { connectors: [] };
    }
    const client = await plugins.actions.getActionsClientWithRequest(resources.request);
    const all = await client.getAll();
    return {
      connectors: all
        .filter((connector) => connector.actionTypeId === EMAIL_ACTION_TYPE)
        .map((connector) => ({ id: connector.id, name: connector.name })),
    };
  },
});

export const listRumReportSchedulesRoute = createUxServerRoute({
  endpoint: 'GET /internal/ux/rum/report_schedules',
  options: { access: 'internal' },
  security: { authz: { requiredPrivileges: ['apm'] } },
  handler: async (resources): Promise<{ schedules: RumReportSchedule[] }> => {
    const { savedObjects } = await resources.context.core;
    const found = await savedObjects.client.find<RumReportScheduleAttributes>({
      type: RUM_REPORT_SCHEDULE_SO_TYPE,
      perPage: 100,
      sortField: 'createdAt',
      sortOrder: 'desc',
    });
    return {
      schedules: found.saved_objects.map((so) => toSchedule(so.id, so.attributes)),
    };
  },
});

export const createRumReportScheduleRoute = createUxServerRoute({
  endpoint: 'POST /internal/ux/rum/report_schedules',
  options: { access: 'internal' },
  security: { authz: { requiredPrivileges: ['apm'] } },
  params: t.type({ body: createBodyCodec }),
  handler: async (resources): Promise<RumReportSchedule> => {
    const body = resources.params.body;
    if (!isRumReportCadence(body.cadence)) {
      throw new Error(`Unknown cadence: ${body.cadence}`);
    }
    if (!isRumReportTemplateId(body.templateId)) {
      throw new Error(`Unknown report template: ${body.templateId}`);
    }
    if (body.to.length === 0) {
      throw new Error('At least one recipient is required');
    }
    await requireActionsAndTasks(resources);
    const spaceId = await spaceIdOf(resources);
    const { savedObjects } = await resources.context.core;
    const spec = normalizeScheduleSpec(body);
    const attributes: RumReportScheduleAttributes = {
      name: body.name,
      enabled: body.enabled ?? true,
      ...spec,
      connectorId: body.connectorId,
      to: body.to.slice(0, 20),
      templateId: body.templateId,
      filters: body.filters,
      includeAi: body.includeAi ?? false,
      inferenceConnectorId: body.inferenceConnectorId,
      createdAt: new Date().toISOString(),
    };
    const created = await savedObjects.client.create<RumReportScheduleAttributes>(
      RUM_REPORT_SCHEDULE_SO_TYPE,
      attributes
    );
    await upsertTask(resources, created.id, attributes, spaceId);
    return toSchedule(created.id, created.attributes);
  },
});

export const updateRumReportScheduleRoute = createUxServerRoute({
  endpoint: 'PUT /internal/ux/rum/report_schedules/{id}',
  options: { access: 'internal' },
  security: { authz: { requiredPrivileges: ['apm'] } },
  params: t.type({
    path: t.type({ id: boundedString(128) }),
    body: updateBodyCodec,
  }),
  handler: async (resources): Promise<RumReportSchedule> => {
    const { id } = resources.params.path;
    const body = resources.params.body;
    if (body.cadence && !isRumReportCadence(body.cadence)) {
      throw new Error(`Unknown cadence: ${body.cadence}`);
    }
    if (body.to && body.to.length === 0) {
      throw new Error('At least one recipient is required');
    }
    const { savedObjects } = await resources.context.core;
    const existing = await savedObjects.client.get<RumReportScheduleAttributes>(
      RUM_REPORT_SCHEDULE_SO_TYPE,
      id
    );
    const spec = normalizeScheduleSpec({
      ...existing.attributes,
      ...body,
    });
    const attributes: RumReportScheduleAttributes = {
      ...existing.attributes,
      ...spec,
      ...(body.name ? { name: body.name } : {}),
      ...(body.connectorId ? { connectorId: body.connectorId } : {}),
      ...(body.to ? { to: body.to.slice(0, 20) } : {}),
      ...(body.enabled != null ? { enabled: body.enabled } : {}),
      ...(body.includeAi != null ? { includeAi: body.includeAi } : {}),
      ...(body.inferenceConnectorId ? { inferenceConnectorId: body.inferenceConnectorId } : {}),
    };
    const updated = await savedObjects.client.update<RumReportScheduleAttributes>(
      RUM_REPORT_SCHEDULE_SO_TYPE,
      id,
      attributes
    );
    const spaceId = await spaceIdOf(resources);
    await upsertTask(resources, id, attributes, spaceId);
    return toSchedule(id, { ...attributes, ...updated.attributes });
  },
});

export const deleteRumReportScheduleRoute = createUxServerRoute({
  endpoint: 'DELETE /internal/ux/rum/report_schedules/{id}',
  options: { access: 'internal' },
  security: { authz: { requiredPrivileges: ['apm'] } },
  params: t.type({
    path: t.type({ id: boundedString(128) }),
  }),
  handler: async (resources): Promise<{ ok: true }> => {
    const { id } = resources.params.path;
    const { savedObjects } = await resources.context.core;
    const plugins = await resources.startPlugins();
    await savedObjects.client.delete(RUM_REPORT_SCHEDULE_SO_TYPE, id);
    if (plugins.taskManager) {
      await plugins.taskManager.remove(rumReportEmailTaskId(id)).catch(() => undefined);
    }
    return { ok: true };
  },
});

export const sendRumReportNowRoute = createUxServerRoute({
  endpoint: 'POST /internal/ux/rum/report_schedules/_send',
  options: { access: 'internal' },
  security: { authz: { requiredPrivileges: ['apm'] } },
  params: t.type({
    body: t.intersection([
      t.type({
        connectorId: boundedString(128),
        to: t.array(boundedString(256)),
        templateId: boundedString(32),
        rangeFrom: boundedString(64),
        rangeTo: boundedString(64),
        filters: filtersCodec,
      }),
      t.partial({
        compare: boundedString(16),
        name: boundedString(200),
        includeAi: t.boolean,
        inferenceConnectorId: boundedString(128),
      }),
    ]),
  }),
  handler: async (resources): Promise<{ ok: true }> => {
    const body = resources.params.body;
    if (!isRumReportTemplateId(body.templateId)) {
      throw new Error(`Unknown report template: ${body.templateId}`);
    }
    const to = body.to.slice(0, 20);
    if (to.length === 0) {
      throw new Error('At least one recipient is required');
    }
    const plugins = await requireActionsAndTasks(resources);
    const coreStart = await resources.core.start();
    const spaceId = await spaceIdOf(resources);
    const spec = normalizeScheduleSpec({});
    await sendRumReportEmail({
      actions: plugins.actions,
      coreStart,
      logger: resources.logger,
      resources,
      schedule: {
        name: body.name ?? 'UX report',
        enabled: true,
        ...spec,
        connectorId: body.connectorId,
        to,
        templateId: body.templateId,
        filters: body.filters,
        includeAi: body.includeAi ?? false,
        inferenceConnectorId: body.inferenceConnectorId,
        createdAt: new Date().toISOString(),
      },
      spaceId,
      rangeFrom: body.rangeFrom,
      rangeTo: body.rangeTo,
      compare: body.compare,
    });
    return { ok: true };
  },
});

export const sendRumReportScheduleNowRoute = createUxServerRoute({
  endpoint: 'POST /internal/ux/rum/report_schedules/{id}/_send',
  options: { access: 'internal' },
  security: { authz: { requiredPrivileges: ['apm'] } },
  params: t.type({
    path: t.type({ id: boundedString(128) }),
  }),
  handler: async (resources): Promise<{ ok: true }> => {
    const { id } = resources.params.path;
    const plugins = await requireActionsAndTasks(resources);
    const coreStart = await resources.core.start();
    const { savedObjects } = await resources.context.core;
    const so = await savedObjects.client.get<RumReportScheduleAttributes>(
      RUM_REPORT_SCHEDULE_SO_TYPE,
      id
    );
    const spaceId = await spaceIdOf(resources);
    await sendRumReportEmail({
      actions: plugins.actions,
      coreStart,
      logger: resources.logger,
      resources,
      schedule: so.attributes,
      scheduleId: id,
      spaceId,
    });
    await savedObjects.client.update<RumReportScheduleAttributes>(RUM_REPORT_SCHEDULE_SO_TYPE, id, {
      ...so.attributes,
      lastRunAt: new Date().toISOString(),
      lastError: undefined,
    });
    return { ok: true };
  },
});

export const testRumReportEmailConnectorRoute = createUxServerRoute({
  endpoint: 'POST /internal/ux/rum/report_schedules/connectors/{id}/_test',
  options: { access: 'internal' },
  security: { authz: { requiredPrivileges: ['apm'] } },
  params: t.type({
    path: t.type({ id: boundedString(128) }),
    body: t.type({
      to: t.array(boundedString(256)),
    }),
  }),
  handler: async (resources): Promise<{ ok: true }> => {
    const { id } = resources.params.path;
    const to = resources.params.body.to.slice(0, 20);
    if (to.length === 0) {
      throw new Error('At least one recipient is required');
    }
    const plugins = await requireActionsAndTasks(resources);
    const spaceId = await spaceIdOf(resources);
    await sendRumReportEmailTest({
      actions: plugins.actions,
      connectorId: id,
      spaceId,
      to,
    });
    return { ok: true };
  },
});
