/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Automation } from '../../hooks/use_automations';
import { getWebhookExamplePayload } from '../../utils/webhook_example';
import {
  createAutomationFormValues,
  createTriggerFormValues,
  toAutomationFormValues,
  type TriggerFormValues,
} from './automation_form_values';
import { getSaveBlocker, isTriggerValid } from './validation';
import { toAutomationRequestBody } from './to_automation_request';

const buildAutomation = (row: Automation['trigger']['rows'][number]): Automation => ({
  id: 'automation-1',
  name: 'Hook',
  automationType: 'custom',
  isEnabled: true,
  trigger: { rows: [row] },
  execution: {},
  completions: [],
  runtime: {},
  createdAt: '2026-10-01T00:00:00.000Z',
  updatedAt: '2026-10-01T00:00:00.000Z',
  author: 'elastic',
});

describe('webhook trigger form values', () => {
  it('starts as a remote Elastic alert, which cannot be saved until a cluster is chosen', () => {
    const trigger = createTriggerFormValues('webhook');
    expect(trigger).toEqual({ kind: 'webhook', mode: 'alert' });
    expect(isTriggerValid(trigger)).toBe(false);
    expect(isTriggerValid({ kind: 'webhook', mode: 'alert', clusterConnectorId: 'es-1' })).toBe(
      true
    );
  });

  it('explains what is missing, and lets a request webhook saved earlier through', () => {
    const values = (trigger: TriggerFormValues) => ({
      ...createAutomationFormValues(),
      name: 'Hook',
      trigger,
    });
    expect(getSaveBlocker(values({ kind: 'webhook', mode: 'alert' }))).toBe(
      'Choose the cluster the alerts come from before saving'
    );
    expect(
      getSaveBlocker(values({ kind: 'webhook', mode: 'alert', clusterConnectorId: 'es-1' }))
    ).toBeUndefined();
    expect(getSaveBlocker(values({ kind: 'webhook', mode: 'generic' }))).toBeUndefined();
    expect(isTriggerValid({ kind: 'webhook', mode: 'generic' })).toBe(true);
  });

  it('reads the mode and connector back from a saved automation', () => {
    const { trigger } = toAutomationFormValues(
      buildAutomation({ kind: 'webhook', mode: 'alert', connectorId: 'connector-1' })
    );
    expect(trigger).toEqual({ kind: 'webhook', mode: 'alert', connectorId: 'connector-1' });
  });

  it('treats a webhook saved without a mode as generic', () => {
    const { trigger } = toAutomationFormValues(
      buildAutomation({ kind: 'webhook', connectorId: 'connector-1' })
    );
    expect(trigger).toMatchObject({ kind: 'webhook', mode: 'generic' });
  });

  it('sends the mode but never the connector, which only the server provisions', () => {
    const trigger: TriggerFormValues = {
      kind: 'webhook',
      mode: 'alert',
      connectorId: 'connector-1',
    };
    const body = toAutomationRequestBody({
      ...createAutomationFormValues(),
      name: 'Hook',
      trigger,
    });
    expect(body.trigger.rows).toEqual([{ kind: 'webhook', mode: 'alert' }]);
  });

  describe('cluster connector', () => {
    const body = (trigger: TriggerFormValues) =>
      toAutomationRequestBody({ ...createAutomationFormValues(), name: 'Hook', trigger });

    it('reads the chosen cluster connector back from a saved automation', () => {
      const { trigger } = toAutomationFormValues(
        buildAutomation({
          kind: 'webhook',
          mode: 'alert',
          connectorId: 'connector-1',
          clusterConnectorId: 'es-1',
          clusterConnectorName: 'Cluster A',
        })
      );
      expect(trigger).toMatchObject({ kind: 'webhook', clusterConnectorId: 'es-1' });
    });

    it('sends the chosen cluster connector of an alert webhook', () => {
      expect(
        body({ kind: 'webhook', mode: 'alert', clusterConnectorId: 'es-1' }).trigger.rows
      ).toEqual([{ kind: 'webhook', mode: 'alert', clusterConnectorId: 'es-1' }]);
    });

    it('sends no cluster connector when none is chosen, or for a request webhook', () => {
      expect(body({ kind: 'webhook', mode: 'alert' }).trigger.rows).toEqual([
        { kind: 'webhook', mode: 'alert' },
      ]);
      expect(
        body({ kind: 'webhook', mode: 'generic', clusterConnectorId: 'es-1' }).trigger.rows
      ).toEqual([{ kind: 'webhook', mode: 'generic' }]);
    });
  });
});

describe('getWebhookExamplePayload', () => {
  it('gives the alert webhook a payload with the fields it requires', () => {
    expect(JSON.parse(getWebhookExamplePayload('alert'))).toEqual({
      id: expect.any(String),
      name: expect.any(String),
      status: 'active',
    });
  });

  it('gives the generic webhook an arbitrary payload', () => {
    expect(JSON.parse(getWebhookExamplePayload('generic'))).toEqual({
      message: expect.any(String),
    });
  });
});
