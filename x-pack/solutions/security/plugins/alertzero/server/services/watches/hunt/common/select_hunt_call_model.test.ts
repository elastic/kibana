/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ScopedModel } from '@kbn/agent-builder-server';
import { selectHuntCallModel } from './select_hunt_call_model';

const model = (id: string, templateRequired = false): ScopedModel =>
  ({
    connector: {
      connectorId: id,
      metadata: templateRequired ? { capabilities: { templates: { policy: 'required' } } } : {},
    },
  } as unknown as ScopedModel);

describe('selectHuntCallModel', () => {
  const tier = model('frontier');
  const cyber = model('daybreak');
  const templateCyber = model('daybreak', true);

  it('keeps the tier model when the cyber row is empty', () => {
    expect(selectHuntCallModel({ tierModel: tier })).toBe(tier);
  });

  it('uses the cyber model when one is saved', () => {
    expect(selectHuntCallModel({ tierModel: tier, cyberModel: cyber })).toBe(cyber);
  });

  it('uses a template-required cyber model for a call that can send a template', () => {
    expect(selectHuntCallModel({ tierModel: tier, cyberModel: templateCyber })).toBe(templateCyber);
  });

  it('keeps the tier model for a messages-only call when the cyber model requires a template', () => {
    expect(
      selectHuntCallModel({ tierModel: tier, cyberModel: templateCyber, messagesOnly: true })
    ).toBe(tier);
  });

  it('uses a messages-capable cyber model for a messages-only call', () => {
    expect(selectHuntCallModel({ tierModel: tier, cyberModel: cyber, messagesOnly: true })).toBe(
      cyber
    );
  });
});
