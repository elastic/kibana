/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { agentBuilderMocks } from '@kbn/agent-builder-plugin/server/mocks';
import type { AttachmentTypeDefinition } from '@kbn/agent-builder-server/attachments';
import { registerAttachments } from './register_attachments';

// The platform prompt owns when to render an attachment. A type description may say what the
// card shows ("Rendering this attachment inline displays ...") and nothing else about
// rendering, because a rule like "render whenever present" makes the agent re-render every
// card on every reply. Rather than guess at rewordings of that rule, every mention of
// rendering other than these is rejected.
const ALLOWED_RENDER_MENTIONS = [
  /^Rendering this attachment inline displays[^\n]*$/m,
  /at render time/,
];

const withoutAllowedMentions = (description: string): string =>
  ALLOWED_RENDER_MENTIONS.reduce((text, allowed) => text.replace(allowed, ''), description);

describe('registerAttachments', () => {
  const setup = agentBuilderMocks.createSetup();
  const registered: AttachmentTypeDefinition[] = [];

  beforeAll(() => {
    registerAttachments(setup);
    setup.attachments.registerType.mock.calls.forEach(([definition]) => {
      registered.push(definition);
    });
  });

  it('registers the Hunt Watch attachment types', () => {
    expect(registered.map(({ id }) => id).sort()).toEqual([
      'security.hunt_coordinator_result',
      'security.significant_security_event',
      'security.threat',
    ]);
  });

  // A new description-bearing type must be added here on purpose, so it is checked too.
  it('gives only the threat and significant security event types an agent description', () => {
    expect(
      registered
        .filter(({ getAgentDescription }) => getAgentDescription)
        .map(({ id }) => id)
        .sort()
    ).toEqual(['security.significant_security_event', 'security.threat']);
  });

  it.each(['security.threat', 'security.significant_security_event'])(
    'says what the %s card shows and nothing else about rendering',
    (id) => {
      const description = registered.find((type) => type.id === id)?.getAgentDescription?.() ?? '';

      expect(description).toMatch(ALLOWED_RENDER_MENTIONS[0]);
      expect(withoutAllowedMentions(description)).not.toMatch(/render/i);
    }
  );
});
