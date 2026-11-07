/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { buildGeneratedEntityStory } from './security_story';
import type { GeneratedEntityStoryOptions } from './security_story';

const options: GeneratedEntityStoryOptions = {
  spaceId: 'default',
  scenarioId: 'entity-story-one',
  startedAt: '2026-10-13T20:00:00.000Z',
  user: { id: 'account-1', name: 'Alex Chen', entityId: 'user:alex.chen@workstation@local' },
  host: { id: 'machine-1', name: 'WORKSTATION-01', entityId: 'host:workstation-01' },
};

describe('generated entity security story', () => {
  it('links each generated observation to the exact supplied entity IDs and identity values', () => {
    const story = buildGeneratedEntityStory(options);
    expect(story).toHaveLength(4);
    story.forEach((event, index) => {
      expect(event).toMatchObject({
        user: { id: options.user.id, name: options.user.name },
        host: { id: options.host.id, name: options.host.name },
        entity: { id: [options.user.entityId, options.host.entityId] },
        kibana: { space_id: 'default' },
        entity_intelligence: {
          schema_version: 1,
          actor_provenance: 'generated',
          scenario: { id: options.scenarioId, step: index + 1, kind: 'generated' },
        },
      });
      expect(event).not.toHaveProperty('agent');
      expect(event).not.toHaveProperty('session');
      expect(event.entity_intelligence).not.toHaveProperty('agent');
      expect(event.entity_intelligence.activity.target).toMatch(/fixture/);
      if (event.entity_intelligence.control) {
        expect(event.entity_intelligence.control.engine).toBe('Generated policy observations');
        expect(event.entity_intelligence.control.reason).toMatch(/^Generated fixture observation:/);
      }
    });
  });

  it('orders the authentication, privilege, prevention and export evidence at precise relative times', () => {
    const story = buildGeneratedEntityStory(options);
    expect(
      story.map((event) => [event['@timestamp'], event.entity_intelligence.activity.type])
    ).toEqual([
      ['2026-10-13T19:48:00.000Z', 'suspicious_authentication'],
      ['2026-10-13T19:52:00.000Z', 'privilege_change'],
      ['2026-10-13T19:56:00.000Z', 'protected_file_access'],
      ['2026-10-13T19:59:00.000Z', 'unapproved_export'],
    ]);
    expect(story[0].event.category).toEqual(['authentication']);
    expect(story[0].entity_intelligence.control).toBeUndefined();
    expect(story.slice(1).map((event) => event.entity_intelligence.control)).toEqual([
      expect.objectContaining({ decision: 'deny', mode: 'monitor', outcome: 'allowed' }),
      expect.objectContaining({ decision: 'deny', mode: 'enforce', outcome: 'blocked' }),
      expect.objectContaining({ decision: 'deny', mode: 'monitor', outcome: 'allowed' }),
    ]);
  });

  it('supports idempotent replay while separating spaces, scenarios and steps', () => {
    const ids = buildGeneratedEntityStory(options).map((event) => event.event.id);
    expect(new Set(ids).size).toBe(4);
    expect(ids.every((id) => /^[a-f0-9]{64}$/.test(id))).toBe(true);
    expect(
      buildGeneratedEntityStory({ ...options, startedAt: '2026-10-13T21:00:00.000Z' }).map(
        (event) => event.event.id
      )
    ).toEqual(ids);
    expect(
      buildGeneratedEntityStory({ ...options, scenarioId: 'entity-story-two' }).map(
        (event) => event.event.id
      )
    ).not.toEqual(ids);
    expect(
      buildGeneratedEntityStory({ ...options, spaceId: 'other' }).map((event) => event.event.id)
    ).not.toEqual(ids);
  });

  it('returns independent records without allowing callers to mutate later story builds', () => {
    const first = buildGeneratedEntityStory(options);
    first[0].event.category.push('file');
    first[1].entity_intelligence.control = undefined;
    first[2].entity.id.push('host:unrelated');
    const second = buildGeneratedEntityStory(options);
    expect(second[0].event.category).toEqual(['authentication']);
    expect(second[1].entity_intelligence.control).toBeDefined();
    expect(second[2].entity.id).toEqual([options.user.entityId, options.host.entityId]);
  });

  it.each(['invalid', '2026-02-30T00:00:00.000Z', '2026-10-13', '1970-01-01T00:01:00.000Z'])(
    'rejects timestamp %s',
    (startedAt) => {
      expect(() => buildGeneratedEntityStory({ ...options, startedAt })).toThrow(
        'valid canonical UTC timestamp'
      );
    }
  );

  it.each(['', '*', 'default,other', '../default', 'A'.repeat(65)])(
    'rejects invalid space %s',
    (spaceId) => {
      expect(() => buildGeneratedEntityStory({ ...options, spaceId })).toThrow('Invalid space ID');
    }
  );

  it.each(['', 'bad\nid', 'x'.repeat(513)])(
    'rejects invalid scenario and entity IDs',
    (invalid) => {
      expect(() => buildGeneratedEntityStory({ ...options, scenarioId: invalid })).toThrow(
        'bounded scenario'
      );
      expect(() =>
        buildGeneratedEntityStory({ ...options, user: { ...options.user, entityId: invalid } })
      ).toThrow('bounded scenario');
      expect(() =>
        buildGeneratedEntityStory({ ...options, host: { ...options.host, id: invalid } })
      ).toThrow('bounded scenario');
    }
  );

  it.each(['', ' leading', 'trailing ', 'bad\nname', 'x'.repeat(257)])(
    'rejects invalid names',
    (name) => {
      expect(() =>
        buildGeneratedEntityStory({ ...options, user: { ...options.user, name } })
      ).toThrow('bounded scenario');
      expect(() =>
        buildGeneratedEntityStory({ ...options, host: { ...options.host, name } })
      ).toThrow('bounded scenario');
    }
  );
});
