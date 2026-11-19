/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  validateAlertWorkflowTargets,
  validateAttackWorkflowTargets,
  validateEventWorkflowTargets,
} from './workflow_validation';

describe('attachment workflow validation', () => {
  it('accepts alert targets that match the selected alert inputs', () => {
    expect(() =>
      validateAlertWorkflowTargets({
        targets: [{ id: 'alert-1' }, { id: 'alert-2' }],
        inputs: {
          event: {
            alertIds: [{ _id: 'alert-2' }, { _id: 'alert-1' }],
          },
        },
      })
    ).not.toThrow();
  });

  it('rejects alert targets that do not match the selected alerts', () => {
    expect(() =>
      validateAlertWorkflowTargets({
        targets: [{ id: 'alert-1' }],
        inputs: { event: { alertIds: [{ _id: 'alert-2' }] } },
      })
    ).toThrow('Alert workflow origin targets must match the selected alerts.');
  });

  it('rejects alert targets without alert inputs', () => {
    expect(() =>
      validateAlertWorkflowTargets({
        targets: [{ id: 'alert-1' }],
        inputs: { event: { documents: [{ _id: 'alert-1' }] } },
      })
    ).toThrow('Alert attachment workflow origins require selected alert inputs.');
  });

  it('accepts attack targets that match the selected attack inputs', () => {
    expect(() =>
      validateAttackWorkflowTargets({
        targets: [{ id: 'attack-1' }, { id: 'attack-2' }],
        inputs: {
          event: {
            alertIds: [{ _id: 'attack-2' }, { _id: 'attack-1' }],
          },
        },
      })
    ).not.toThrow();
  });

  it('rejects attack targets that do not match the selected attacks', () => {
    expect(() =>
      validateAttackWorkflowTargets({
        targets: [{ id: 'attack-1' }],
        inputs: { event: { alertIds: [{ _id: 'attack-2' }] } },
      })
    ).toThrow('Attack workflow origin targets must match the selected attacks.');
  });

  it('rejects attack targets without attack inputs', () => {
    expect(() =>
      validateAttackWorkflowTargets({
        targets: [{ id: 'attack-1' }],
        inputs: {},
      })
    ).toThrow('Attack attachment workflow origins require selected attack inputs.');
  });

  it('accepts event targets selected through documentIds', () => {
    expect(() =>
      validateEventWorkflowTargets({
        targets: [{ id: 'event-1' }],
        inputs: { event: { documentIds: [{ _id: 'event-1', _index: 'logs' }] } },
      })
    ).not.toThrow();
  });

  it('rejects event targets that do not match the selected documentIds', () => {
    expect(() =>
      validateEventWorkflowTargets({
        targets: [{ id: 'event-1' }],
        inputs: { event: { documentIds: [{ _id: 'event-2', _index: 'logs' }] } },
      })
    ).toThrow('Event workflow origin targets must match the selected documents.');
  });

  it('rejects event targets without document inputs', () => {
    expect(() =>
      validateEventWorkflowTargets({
        targets: [{ id: 'event-1' }],
        inputs: {},
      })
    ).toThrow('Event attachment workflow origins require selected document inputs.');
  });

  it('accepts event targets that match the selected document inputs', () => {
    expect(() =>
      validateEventWorkflowTargets({
        targets: [{ id: 'event-1' }, { id: 'event-2' }],
        inputs: { event: { documents: [{ _id: 'event-2' }, { _id: 'event-1' }] } },
      })
    ).not.toThrow();
  });

  it('rejects event targets that do not match the selected documents', () => {
    expect(() =>
      validateEventWorkflowTargets({
        targets: [{ id: 'event-1' }],
        inputs: { event: { alertIds: [{ _id: 'event-1' }], documents: [{ _id: 'event-2' }] } },
      })
    ).toThrow('Event workflow origin targets must match the selected documents.');
  });
});
