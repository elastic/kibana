/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { AgentBuilderPluginSetup } from '@kbn/agent-builder-server';
import type { AttachmentTypeDefinition } from '@kbn/agent-builder-server/attachments';
import { registerAttachments } from './register_attachments';

const FORBIDDEN_RENDER_GUIDANCE = [
  /render_attachment/,
  /INLINE RENDERING/,
  /must render/i,
  /always render/i,
  /whenever[^.]*render/i,
  /render[^.]*whenever/i,
];

describe('registerAttachments', () => {
  const registered: AttachmentTypeDefinition[] = [];

  beforeAll(() => {
    const registerType = jest.fn((definition: AttachmentTypeDefinition) => {
      registered.push(definition);
    });
    registerAttachments({
      attachments: { registerType },
    } as unknown as AgentBuilderPluginSetup);
  });

  it('registers the Hunt Watch attachment types', () => {
    expect(registered.map(({ id }) => id).sort()).toEqual([
      'security.hunt_coordinator_result',
      'security.significant_security_event',
      'security.threat',
    ]);
  });

  // The platform prompt owns when to render an attachment. A type description that says
  // "render whenever present" makes the agent re-render every card on every reply.
  it('never tells the agent when to render an attachment', () => {
    const descriptions = registered.flatMap(({ getAgentDescription }) =>
      getAgentDescription ? [getAgentDescription()] : []
    );

    expect(descriptions.length).toBeGreaterThan(0);
    for (const description of descriptions) {
      for (const pattern of FORBIDDEN_RENDER_GUIDANCE) {
        expect(description).not.toMatch(pattern);
      }
    }
  });
});
