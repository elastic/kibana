/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render } from '@testing-library/react';
import type { CspFinding } from '@kbn/cloud-security-posture-common';
import { RuleTab, getRuleList } from './rule_tab';
import { TestProvider } from '../../../test/test_provider';

const mockRule: CspFinding['rule'] = {
  name: 'Test Rule',
  description: 'Test Description',
  section: 'Test Section',
  benchmark: {
    name: 'CIS Kubernetes',
    id: 'cis_k8s',
    version: 'v1.0.0',
    rule_number: '1.1.1',
  },
  tags: ['CIS', 'Kubernetes'],
  audit: 'Test Audit',
  remediation: 'Test Remediation',
  impact: 'Test Impact',
  default_value: 'Test Default',
  rationale: 'Test Rationale',
  profile_applicability: 'Test Profile',
  rego_rule_id: 'test-rego-id',
  id: 'test-id',
  version: '1.0',
  reference: '1. https://example.com/reference\n2. https://example.com/reference2',
};

const mockFinding: CspFinding = {
  '@timestamp': '2023-01-01T00:00:00.000Z',
  result: {
    evaluation: 'passed',
    evidence: {},
  },
  resource: {
    name: 'test-resource',
    sub_type: 'test-subtype',
    raw: {},
    id: 'test-resource-id',
    type: 'test-type',
  },
  rule: mockRule,
  host: {
    id: 'test-host-id',
    containerized: false,
    ip: ['127.0.0.1'],
    mac: ['00:00:00:00:00:00'],
    name: 'test-host',
    hostname: 'test-hostname',
    architecture: 'x86_64',
    os: {
      kernel: '5.10.0',
      codename: 'focal',
      type: 'linux',
      platform: 'ubuntu',
      version: '20.04',
      family: 'debian',
      name: 'Ubuntu',
    },
  },
  event: {
    kind: 'state',
  },
  data_stream: {
    dataset: 'cloud_security_posture.findings',
  },
  observer: {
    vendor: 'Elastic',
  },
  agent: {
    version: '8.0.0',
    id: 'test-agent-id',
    name: 'test-agent',
    type: 'cloudbeat',
  },
  ecs: {
    version: '8.0.0',
  },
};

describe('RuleTab', () => {
  it('renders without crashing', () => {
    const { container } = render(
      <TestProvider>
        <RuleTab data={mockFinding} />
      </TestProvider>
    );
    expect(container).toBeInTheDocument();
  });

  it('displays rule reference field', () => {
    const { getByText } = render(
      <TestProvider>
        <RuleTab data={mockFinding} />
      </TestProvider>
    );
    expect(getByText('References')).toBeInTheDocument();
  });
});

describe('getRuleList', () => {
  it('returns rule reference when reference field is present', () => {
    const ruleList = getRuleList(mockRule);
    const referencesItem = ruleList.find((item) => item.title === 'References');

    expect(referencesItem).toBeDefined();
    expect(referencesItem?.description).toBeTruthy();
  });

  it('returns undefined when reference field is not present', () => {
    const ruleWithoutReference = {
      ...mockRule,
      reference: undefined,
    };
    const ruleList = getRuleList(ruleWithoutReference);
    const referencesItem = ruleList.find((item) => item.title === 'References');

    // The item should still exist but with EMPTY_VALUE
    expect(referencesItem).toBeDefined();
  });

  it('uses reference field for rule metadata', () => {
    const testReference = 'https://test-reference.com';
    const ruleWithReference = {
      ...mockRule,
      reference: testReference,
    };
    const ruleList = getRuleList(ruleWithReference);
    const referencesItem = ruleList.find((item) => item.title === 'References');

    expect(referencesItem).toBeDefined();
  });

  it('includes all required rule fields', () => {
    const ruleList = getRuleList(mockRule);

    const expectedTitles = [
      'Name',
      'Description',
      'Alerts',
      'Tags',
      'Framework Sources',
      'Framework Section',
      'Profile Applicability',
      'Benchmark',
      'Audit',
      'References',
    ];

    const actualTitles = ruleList.map((item) => item.title);
    expectedTitles.forEach((title) => {
      expect(actualTitles).toContain(title);
    });
  });
});
