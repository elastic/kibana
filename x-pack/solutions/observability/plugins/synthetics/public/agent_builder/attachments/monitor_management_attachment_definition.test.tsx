/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import type {
  AttachmentRenderProps,
  AttachmentServiceStartContract,
  AttachmentUIDefinition,
  CanvasRenderCallbacks,
  GetActionButtonsParams,
} from '@kbn/agent-builder-browser/attachments';
import { ActionButtonType } from '@kbn/agent-builder-browser/attachments';
import type { ApplicationStart, HttpStart } from '@kbn/core/public';
import { ConfigKey } from '../../../common/runtime_types';
import {
  MonitorTypeEnum,
  ScheduleUnit,
  SourceType,
} from '../../../common/runtime_types/monitor_management/monitor_configs';
import {
  MONITOR_MANAGEMENT_ATTACHMENT_TYPE,
  type MonitorAttachmentData,
} from '../../../common/agent_builder';
import {
  buildMonitorManagementAttachmentUIDefinition,
  registerMonitorManagementAttachmentUIDefinition,
} from './monitor_management_attachment_definition';

const stubHttp = {} as HttpStart;
const stubApplication = {
  capabilities: { uptime: { save: true, elasticManagedLocationsEnabled: true } },
  getUrlForApp: jest.fn(() => '/app/synthetics'),
  navigateToUrl: jest.fn(),
} as unknown as ApplicationStart;

const buildDefinition = () =>
  buildMonitorManagementAttachmentUIDefinition({
    http: stubHttp,
    application: stubApplication,
  });

const buildAttachment = (overrides: Partial<MonitorAttachmentData> = {}) => ({
  id: 'attachment-1',
  type: MONITOR_MANAGEMENT_ATTACHMENT_TYPE,
  data: {
    [ConfigKey.NAME]: 'Existing monitor',
    [ConfigKey.MONITOR_TYPE]: MonitorTypeEnum.HTTP,
    [ConfigKey.ENABLED]: true,
    [ConfigKey.SCHEDULE]: { number: '5', unit: ScheduleUnit.MINUTES },
    [ConfigKey.LOCATIONS]: [{ id: 'us_central', isServiceManaged: true }],
    [ConfigKey.URLS]: 'https://example.com',
    [ConfigKey.MONITOR_SOURCE_TYPE]: SourceType.UI,
    ...overrides,
  } as MonitorAttachmentData,
});

const renderProps = (
  attachment: ReturnType<typeof buildAttachment>
): AttachmentRenderProps<typeof attachment> => ({
  attachment,
  isSidebar: false,
});

const buildCallbacks = (): CanvasRenderCallbacks => ({
  registerActionButtons: jest.fn(),
  updateOrigin: jest.fn(async () => undefined),
  closeCanvas: jest.fn(),
});

describe('buildMonitorManagementAttachmentUIDefinition', () => {
  describe('getLabel', () => {
    it('returns the monitor name when present', () => {
      const definition = buildDefinition();
      expect(definition.getLabel(buildAttachment({ name: 'My monitor' }))).toBe('My monitor');
    });

    it('falls back to a default i18n label when name is empty', () => {
      const definition = buildDefinition();
      const attachment = buildAttachment();
      const label = definition.getLabel({
        ...attachment,
        data: { ...attachment.data, [ConfigKey.NAME]: '' as unknown as string },
      });
      expect(label).toBe('New Synthetics monitor');
    });
  });

  describe('getIcon', () => {
    it('returns an EUI icon name', () => {
      const definition = buildDefinition();
      expect(definition.getIcon?.()).toBe('uptimeApp');
    });
  });

  describe('canvasWidth', () => {
    it('exposes a 40vw canvas width override', () => {
      const definition = buildDefinition();
      expect(definition.canvasWidth).toBe('40vw');
    });
  });

  describe('renderInlineContent', () => {
    it('lazy-loads the inline content body and renders it under suspense', async () => {
      const definition = buildDefinition();
      const props = renderProps(buildAttachment());
      const node = definition.renderInlineContent?.(props);
      render(<>{node}</>);
      await waitFor(() => {
        expect(screen.getByTestId('syntheticsMonitorAttachmentInline')).toBeInTheDocument();
      });
    });

    it('returns null when attachment.data is missing (defensive)', () => {
      const definition = buildDefinition();
      const partial = {
        id: 'a',
        type: MONITOR_MANAGEMENT_ATTACHMENT_TYPE,
        data: undefined,
      } as unknown as ReturnType<typeof buildAttachment>;
      const props = renderProps(partial);
      const node = definition.renderInlineContent?.(props);
      expect(node).toBeNull();
    });
  });

  describe('renderCanvasContent', () => {
    it('lazy-loads the canvas content body and renders it under suspense', async () => {
      const definition = buildDefinition();
      const props = renderProps(buildAttachment());
      const callbacks = buildCallbacks();
      const node = definition.renderCanvasContent?.(props, callbacks);
      render(<>{node}</>);
      await waitFor(() => {
        expect(screen.getByTestId('syntheticsMonitorAttachmentCanvas')).toBeInTheDocument();
      });
    });

    it('returns null when attachment.data is missing', () => {
      const definition = buildDefinition();
      const partial = {
        id: 'a',
        type: MONITOR_MANAGEMENT_ATTACHMENT_TYPE,
        data: undefined,
      } as unknown as ReturnType<typeof buildAttachment>;
      const props = renderProps(partial);
      const callbacks = buildCallbacks();
      const node = definition.renderCanvasContent?.(props, callbacks);
      expect(node).toBeNull();
    });
  });

  describe('getActionButtons', () => {
    const buildActionButtonParams = (
      overrides: Partial<GetActionButtonsParams<ReturnType<typeof buildAttachment>>> = {}
    ): GetActionButtonsParams<ReturnType<typeof buildAttachment>> => ({
      attachment: buildAttachment(),
      isSidebar: false,
      isCanvas: false,
      updateOrigin: jest.fn(async () => undefined),
      openCanvas: jest.fn(),
      ...overrides,
    });

    it('returns a single Preview button when rendered inline outside the canvas', () => {
      const definition = buildDefinition();
      const params = buildActionButtonParams();
      const buttons = definition.getActionButtons?.(params) ?? [];
      expect(buttons).toHaveLength(1);
      const [preview] = buttons;
      expect(preview.label).toBe('Preview');
      expect(preview.icon).toBe('eye');
      expect(preview.type).toBe(ActionButtonType.SECONDARY);
    });

    it('Preview button delegates to the framework-provided openCanvas callback', () => {
      const definition = buildDefinition();
      const openCanvas = jest.fn();
      const params = buildActionButtonParams({ openCanvas });
      const [preview] = definition.getActionButtons?.(params) ?? [];
      preview.handler();
      expect(openCanvas).toHaveBeenCalledTimes(1);
    });

    it('returns no buttons when already in canvas mode (avoids double registration)', () => {
      const definition = buildDefinition();
      const params = buildActionButtonParams({ isCanvas: true, openCanvas: undefined });
      expect(definition.getActionButtons?.(params)).toEqual([]);
    });

    it('returns no buttons when openCanvas is unavailable (defensive)', () => {
      const definition = buildDefinition();
      const params = buildActionButtonParams({ isCanvas: false, openCanvas: undefined });
      expect(definition.getActionButtons?.(params)).toEqual([]);
    });
  });
});

describe('registerMonitorManagementAttachmentUIDefinition', () => {
  const createAttachmentService = () => {
    const addAttachmentType = jest.fn();
    const getAttachmentUiDefinition = jest.fn();
    return {
      service: {
        addAttachmentType,
        getAttachmentUiDefinition,
      } as unknown as AttachmentServiceStartContract,
      addAttachmentType,
    };
  };

  it('registers a UI definition for MONITOR_MANAGEMENT_ATTACHMENT_TYPE with both renderers and inline action buttons', () => {
    const { service, addAttachmentType } = createAttachmentService();
    registerMonitorManagementAttachmentUIDefinition({
      attachmentService: service,
      http: stubHttp,
      application: stubApplication,
    });
    expect(addAttachmentType).toHaveBeenCalledTimes(1);
    expect(addAttachmentType).toHaveBeenCalledWith(
      MONITOR_MANAGEMENT_ATTACHMENT_TYPE,
      expect.objectContaining<Partial<AttachmentUIDefinition>>({
        getLabel: expect.any(Function),
        getIcon: expect.any(Function),
        renderInlineContent: expect.any(Function),
        renderCanvasContent: expect.any(Function),
        getActionButtons: expect.any(Function),
        canvasWidth: '40vw',
      })
    );
  });

  it('is the only side-effect on the attachment service (no other addAttachmentType calls)', () => {
    const { service, addAttachmentType } = createAttachmentService();
    registerMonitorManagementAttachmentUIDefinition({
      attachmentService: service,
      http: stubHttp,
      application: stubApplication,
    });
    expect(addAttachmentType).toHaveBeenCalledTimes(1);
  });
});
