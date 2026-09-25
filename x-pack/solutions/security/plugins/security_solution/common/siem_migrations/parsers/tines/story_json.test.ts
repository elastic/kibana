/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { TinesStoryParser } from './story_json';
import { getTopologicalAgentOrder } from './graph';
import { TINES_AGENT_TYPES } from './types';
import simpleStory from './mock/simple_story.json';

describe('TinesStoryParser', () => {
  it('parses the Tines Simple story fixture', () => {
    const parsed = TinesStoryParser.parse(simpleStory);

    expect(parsed.name).toBe('Simple story');
    expect(parsed.guid).toBe('8de58314250ff167127d6ae213711de9');
    expect(parsed.agents).toHaveLength(8);
    expect(parsed.links).toHaveLength(7);
    expect(parsed.hasWebhookEntry).toBe(true);
    expect(parsed.agents[2]).toMatchObject({
      type: TINES_AGENT_TYPES.WEBHOOK,
      name: 'Receive events',
      stepName: 'receive_events',
      index: 2,
      outgoingLinks: [3],
    });
    expect(parsed.agents[4]).toMatchObject({
      type: TINES_AGENT_TYPES.EVENT_TRANSFORMATION,
      stepName: 'explode_users',
      incomingLinks: [3],
      outgoingLinks: [6, 5, 0],
    });
  });

  it('orders agents using story links', () => {
    const parsed = TinesStoryParser.parse(simpleStory);
    const order = getTopologicalAgentOrder(parsed.agents, parsed.links);

    // Receive events → Type is infection → Explode users → …
    expect(order.indexOf(2)).toBeLessThan(order.indexOf(3));
    expect(order.indexOf(3)).toBeLessThan(order.indexOf(4));
    expect(order.indexOf(4)).toBeLessThan(order.indexOf(0));
    expect(order.indexOf(0)).toBeLessThan(order.indexOf(7));
    expect(order.indexOf(6)).toBeLessThan(order.indexOf(1));
    expect(order[0]).toBe(2);
  });

  it('rejects empty agent lists', () => {
    expect(() =>
      TinesStoryParser.parse({
        name: 'Empty',
        agents: [],
      })
    ).toThrow(/Invalid Tines story export/);
  });

  it('rejects stories that only contain disabled agents', () => {
    expect(() =>
      TinesStoryParser.parse({
        name: 'Disabled only',
        agents: [
          {
            type: TINES_AGENT_TYPES.HTTP_REQUEST,
            name: 'Disabled HTTP',
            guid: 'disabled-guid',
            disabled: true,
          },
        ],
      })
    ).toThrow(/no enabled agents/);
  });

  it('rejects out-of-range link indexes', () => {
    expect(() =>
      TinesStoryParser.parse({
        name: 'Bad links',
        agents: [
          {
            type: TINES_AGENT_TYPES.WEBHOOK,
            name: 'Receive events',
            guid: 'webhook-guid',
          },
        ],
        links: [{ source: 0, receiver: 9 }],
      })
    ).toThrow(/out-of-range agent index/);
  });

  it('deduplicates colliding step names', () => {
    const parsed = TinesStoryParser.parse({
      name: 'Duplicate names',
      agents: [
        {
          type: TINES_AGENT_TYPES.HTTP_REQUEST,
          name: 'Send request',
          guid: 'a',
        },
        {
          type: TINES_AGENT_TYPES.HTTP_REQUEST,
          name: 'Send request',
          guid: 'b',
        },
      ],
    });

    expect(parsed.agents.map((agent) => agent.stepName)).toEqual([
      'send_request',
      'send_request_1',
    ]);
  });

  it('accepts real Tines exports with null story description', () => {
    const parsed = TinesStoryParser.parse({
      name: 'Kibana Alert Automation',
      description: null,
      guid: '5b05fa3ce88cd95d0668513c0b26a501',
      agents: [
        {
          type: TINES_AGENT_TYPES.WEBHOOK,
          name: 'Receive Kibana Alert',
          disabled: false,
          description: null,
          guid: '19c6a4343bfea580a6939e0075858162',
          options: {
            path: 'kibana-alert-automation',
            verbs: 'get,post',
          },
        },
        {
          type: TINES_AGENT_TYPES.EVENT_TRANSFORMATION,
          name: 'Log Alert Event',
          disabled: false,
          description: null,
          guid: '5f75795fbe6b30227942f0a18b5d723b',
          options: {
            mode: 'message_only',
            payload: {
              alert_body: '=receive_kibana_alert.body',
            },
          },
        },
      ],
      links: [{ source: 0, receiver: 1 }],
    });

    expect(parsed.name).toBe('Kibana Alert Automation');
    expect(parsed.description).toBe('');
    expect(parsed.hasWebhookEntry).toBe(true);
    expect(parsed.agents).toHaveLength(2);
    expect(parsed.agents[0]).toMatchObject({
      stepName: 'receive_kibana_alert',
      outgoingLinks: [1],
    });
    expect(parsed.agents[1]).toMatchObject({
      stepName: 'log_alert_event',
      incomingLinks: [0],
    });
  });
});
