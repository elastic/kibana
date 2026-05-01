/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { loggerMock } from '@kbn/logging-mocks';
import type { AgentBuilderPluginSetup } from '@kbn/agent-builder-plugin/server';
import { MONITOR_MANAGEMENT_ATTACHMENT_TYPE, MONITOR_SML_TYPE } from '../../common/agent_builder';
import { bindAgentBuilder } from './bind_on_setup';
import { monitorManagementSkill } from './skills';

const buildAgentBuilderMock = () => {
  const registerType = jest.fn();
  const registerSmlType = jest.fn();
  const registerSkill = jest.fn();
  return {
    mock: {
      attachments: { registerType },
      sml: { registerType: registerSmlType },
      skills: { register: registerSkill },
    } as unknown as AgentBuilderPluginSetup,
    registerType,
    registerSmlType,
    registerSkill,
  };
};

describe('bindAgentBuilder', () => {
  it('returns plugin_missing without touching anything when agentBuilder is undefined', () => {
    const logger = loggerMock.create();
    const result = bindAgentBuilder({
      agentBuilder: undefined,
      logger,
    });
    expect(result).toEqual({ registered: false, reason: 'plugin_missing' });
  });

  it('registers attachment + SML + skill when the agentBuilder plugin is present', () => {
    const { mock, registerType, registerSmlType, registerSkill } = buildAgentBuilderMock();
    const logger = loggerMock.create();

    const result = bindAgentBuilder({
      agentBuilder: mock,
      logger,
    });

    expect(result).toEqual({ registered: true });
    expect(registerType).toHaveBeenCalledTimes(1);
    expect(registerSmlType).toHaveBeenCalledTimes(1);
    expect(registerSkill).toHaveBeenCalledTimes(1);
  });

  it('registers the attachment type with the correct id', () => {
    const { mock, registerType } = buildAgentBuilderMock();
    bindAgentBuilder({ agentBuilder: mock, logger: loggerMock.create() });
    expect(registerType.mock.calls[0][0]).toEqual(
      expect.objectContaining({ id: MONITOR_MANAGEMENT_ATTACHMENT_TYPE })
    );
  });

  it('registers the SML type with the correct id', () => {
    const { mock, registerSmlType } = buildAgentBuilderMock();
    bindAgentBuilder({ agentBuilder: mock, logger: loggerMock.create() });
    expect(registerSmlType.mock.calls[0][0]).toEqual(
      expect.objectContaining({ id: MONITOR_SML_TYPE })
    );
  });

  it('registers the monitor-management skill exactly as defined', () => {
    const { mock, registerSkill } = buildAgentBuilderMock();
    bindAgentBuilder({ agentBuilder: mock, logger: loggerMock.create() });
    expect(registerSkill).toHaveBeenCalledWith(monitorManagementSkill);
  });
});

describe('monitorManagementSkill', () => {
  it('declares the expected id and name', () => {
    expect(monitorManagementSkill.id).toBe('monitor-management');
    expect(monitorManagementSkill.name).toBe('monitor-management');
    expect(monitorManagementSkill.basePath).toBe('skills/observability');
  });

  it('exposes the manage_synthetics_monitor tool inline', async () => {
    const tools = await monitorManagementSkill.getInlineTools?.();
    expect(tools).toBeDefined();
    expect(tools).toHaveLength(1);
    expect(tools?.[0]?.id).toBe('manage_synthetics_monitor');
  });

  it('mentions SML helpers, attachment type, and the v1 HTTP-only restriction in the prompt', () => {
    expect(monitorManagementSkill.content).toContain('platform.core.sml_search');
    expect(monitorManagementSkill.content).toContain('platform.core.sml_attach');
    expect(monitorManagementSkill.content).toContain(MONITOR_MANAGEMENT_ATTACHMENT_TYPE);
    expect(monitorManagementSkill.content).toContain('HTTP only');
  });

  it('warns the LLM about CLI-managed (project-origin) monitors', () => {
    expect(monitorManagementSkill.content.toLowerCase()).toContain('cli-managed');
    expect(monitorManagementSkill.content).toContain('project');
  });
});
