/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { parseIdentityProposal, renderExtractionInput } from './extract';

describe('parseIdentityProposal', () => {
  it('turns empty identifiers into nulls and trims the rest', () => {
    expect(
      parseIdentityProposal({
        source: 'elastic',
        connector_id: ' remote-es ',
        alert_id: '',
        rule_id: 'rule-1',
        instance_key: '   ',
        evidence: [{ kind: 'post_text', value: 'rule rule-1' }],
      })
    ).toEqual({
      source: 'elastic',
      connector_id: 'remote-es',
      alert_id: null,
      rule_id: 'rule-1',
      instance_key: null,
      evidence: [{ kind: 'post_text', value: 'rule rule-1' }],
    });
  });

  it('rejects a source outside the list', () => {
    expect(() => parseIdentityProposal({ source: 'splunk', evidence: [] })).toThrow(
      /Invalid identity proposal/
    );
  });

  it('bounds the evidence', () => {
    const { evidence } = parseIdentityProposal({
      source: 'unknown',
      evidence: Array.from({ length: 20 }, () => ({ kind: 'post_text', value: 'x'.repeat(5000) })),
    });
    expect(evidence).toHaveLength(10);
    expect(evidence[0].value.length).toBeLessThanOrEqual(2000);
  });
});

describe('renderExtractionInput', () => {
  it('lays out the post, the connectors and the tool calls', () => {
    const rendered = renderExtractionInput({
      postText: 'Alert High error rate is active',
      postPermalink: 'https://slack/p1',
      postReceivedAt: '2026-11-24T10:00:00.000Z',
      connectors: [
        { id: 'remote-es', name: 'Prod', type: '.elasticsearch', url: 'https://prod.es' },
      ],
      toolCalls: [],
    });
    expect(rendered).toContain('Message received at 2026-11-24T10:00:00.000Z (https://slack/p1):');
    expect(rendered).toContain('<message>\nAlert High error rate is active\n</message>');
    expect(rendered).toContain(
      '- id=remote-es type=.elasticsearch name="Prod" url=https://prod.es'
    );
  });

  it('says when there are no connectors', () => {
    expect(
      renderExtractionInput({
        postText: 'hi',
        postReceivedAt: '2026-11-24T10:00:00.000Z',
        connectors: [],
        toolCalls: [],
      })
    ).toContain('Connectors:\n(none)');
  });
});
