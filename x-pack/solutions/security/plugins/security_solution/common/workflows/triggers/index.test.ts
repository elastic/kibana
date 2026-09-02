/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  alertStatusChangedTriggerDef,
  AlertStatusChangedTriggerId,
} from './alerts/alert_status_changed';
import { alertTagsChangedTriggerDef, AlertTagsChangedTriggerId } from './alerts/alert_tags_changed';
import {
  alertAssigneesChangedTriggerDef,
  AlertAssigneesChangedTriggerId,
} from './alerts/alert_assignees_changed';
import {
  attackStatusChangedTriggerDef,
  AttackStatusChangedTriggerId,
} from './attacks/attack_status_changed';
import {
  attackTagsChangedTriggerDef,
  AttackTagsChangedTriggerId,
} from './attacks/attack_tags_changed';
import {
  attackAssigneesChangedTriggerDef,
  AttackAssigneesChangedTriggerId,
} from './attacks/attack_assignees_changed';
import { noteCreatedTriggerDef, NoteCreatedTriggerId } from './notes/note_created';
import { noteUpdatedTriggerDef, NoteUpdatedTriggerId } from './notes/note_updated';

const allDefs = [
  { def: alertStatusChangedTriggerDef, id: AlertStatusChangedTriggerId },
  { def: alertTagsChangedTriggerDef, id: AlertTagsChangedTriggerId },
  { def: alertAssigneesChangedTriggerDef, id: AlertAssigneesChangedTriggerId },
  { def: attackStatusChangedTriggerDef, id: AttackStatusChangedTriggerId },
  { def: attackTagsChangedTriggerDef, id: AttackTagsChangedTriggerId },
  { def: attackAssigneesChangedTriggerDef, id: AttackAssigneesChangedTriggerId },
  { def: noteCreatedTriggerDef, id: NoteCreatedTriggerId },
  { def: noteUpdatedTriggerDef, id: NoteUpdatedTriggerId },
];

describe.each(allDefs)('$def.id', ({ def, id }) => {
  it('has the correct id', () => {
    expect(def.id).toBe(id);
  });

  it('has a non-empty title', () => {
    expect(def.title).toBeTruthy();
  });

  it('has a non-empty description', () => {
    expect(def.description).toBeTruthy();
  });

  it('has stability set to tech_preview', () => {
    expect(def.stability).toBe('tech_preview');
  });

  it('has an eventSchema', () => {
    expect(def.eventSchema).toBeDefined();
  });
});
