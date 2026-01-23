/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render } from '@testing-library/react';

import { getMockAttackDiscoveryAlerts } from '../../../../../attack_discovery/pages/mock/mock_attack_discovery_alerts';
import {
  AttackGroupContent,
  ATTACK_DESCRIPTION_TEST_ID_SUFFIX,
  ATTACK_TITLE_TEST_ID_SUFFIX,
  ATTACK_GROUP_TEST_ID_SUFFIX,
} from '.';

jest.mock(
  '../../../../../attack_discovery/pages/results/attack_discovery_markdown_formatter',
  () => ({
    AttackDiscoveryMarkdownFormatter: jest.fn(({ markdown }) => (
      <div data-test-subj="mock-markdown-formatter">{markdown}</div>
    )),
  })
);

const mockAttack = getMockAttackDiscoveryAlerts()[0];

describe('AttackGroupContent', () => {
  it('should render component with attack details', () => {
    const { getByTestId } = render(
      <AttackGroupContent attack={mockAttack} dataTestSubj="test_id" />
    );

    expect(getByTestId(`test_id${ATTACK_GROUP_TEST_ID_SUFFIX}`)).toBeInTheDocument();
    expect(getByTestId(`test_id${ATTACK_TITLE_TEST_ID_SUFFIX}`)).toHaveTextContent(
      'Unix1 Malware and Credential Theft'
    );
    expect(getByTestId(`test_id${ATTACK_DESCRIPTION_TEST_ID_SUFFIX}`)).toBeInTheDocument();
    expect(getByTestId(`test_id${ATTACK_DESCRIPTION_TEST_ID_SUFFIX}`)).toHaveTextContent(
      'Malware and credential theft detected on {{ host.name SRVMAC08 }}.'
    );
  });

  it('should render an empty state when the attack title is empty', () => {
    const attackWithEmptyTitle = { ...mockAttack, title: '' };
    const { getByTestId } = render(
      <AttackGroupContent attack={attackWithEmptyTitle} dataTestSubj="test_id" />
    );

    expect(getByTestId(`test_id${ATTACK_TITLE_TEST_ID_SUFFIX}`)).toBeEmptyDOMElement();
  });

  it('should render an empty state when the attack summary is empty', () => {
    const attackWithEmptySummary = { ...mockAttack, summaryMarkdown: '' };
    const { getByTestId } = render(
      <AttackGroupContent attack={attackWithEmptySummary} dataTestSubj="test_id" />
    );

    expect(getByTestId(`test_id${ATTACK_DESCRIPTION_TEST_ID_SUFFIX}`)).toBeInTheDocument();
    expect(
      getByTestId(`test_id${ATTACK_DESCRIPTION_TEST_ID_SUFFIX}`).firstChild
    ).toBeEmptyDOMElement();
  });

  it('should show anonymized values when showAnonymized is true', () => {
    const { getByTestId } = render(
      <AttackGroupContent attack={mockAttack} dataTestSubj="test_id" showAnonymized />
    );

    expect(getByTestId(`test_id${ATTACK_TITLE_TEST_ID_SUFFIX}`)).toHaveTextContent(
      'Unix1 Malware and Credential Theft'
    );
    expect(getByTestId(`test_id${ATTACK_DESCRIPTION_TEST_ID_SUFFIX}`)).toHaveTextContent(
      'Malware and credential theft detected on {{ host.name 3d241119-f77a-454e-8ee3-d36e05a8714f }}.'
    );
  });

  it('should show original values when showAnonymized is false', () => {
    const { getByTestId } = render(
      <AttackGroupContent attack={mockAttack} dataTestSubj="test_id" showAnonymized={false} />
    );

    expect(getByTestId(`test_id${ATTACK_TITLE_TEST_ID_SUFFIX}`)).toHaveTextContent(
      'Unix1 Malware and Credential Theft'
    );
    expect(getByTestId(`test_id${ATTACK_DESCRIPTION_TEST_ID_SUFFIX}`)).toHaveTextContent(
      'Malware and credential theft detected on {{ host.name SRVMAC08 }}.'
    );
  });
});
