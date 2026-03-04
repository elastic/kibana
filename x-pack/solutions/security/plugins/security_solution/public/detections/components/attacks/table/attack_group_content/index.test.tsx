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
  ATTACK_STATUS_TEST_ID_SUFFIX,
  ATTACK_SPARKLES_ICON_TEST_ID_SUFFIX,
  EXPAND_ATTACK_BUTTON_TEST_ID,
} from '.';

jest.mock(
  '../../../../../attack_discovery/pages/results/attack_discovery_markdown_formatter',
  () => ({
    AttackDiscoveryMarkdownFormatter: jest.fn(({ markdown }) => (
      <div data-test-subj="mock-markdown-formatter">{markdown}</div>
    )),
  })
);

jest.mock('./subtitle', () => ({
  Subtitle: jest.fn(() => <div data-test-subj="mock-subtitle" />),
}));

const mockAttack = getMockAttackDiscoveryAlerts()[0];

describe('AttackGroupContent', () => {
  it('should render component with attack details', () => {
    const { getByTestId } = render(
      <AttackGroupContent
        attack={mockAttack}
        dataTestSubj="test_id"
        openAttackDetailsFlyout={jest.fn()}
      />
    );

    expect(getByTestId(`test_id${ATTACK_GROUP_TEST_ID_SUFFIX}`)).toBeInTheDocument();
    expect(getByTestId(`test_id${ATTACK_TITLE_TEST_ID_SUFFIX}`)).toHaveTextContent(
      'Unix1 Malware and Credential Theft'
    );
    expect(getByTestId(`test_id${ATTACK_DESCRIPTION_TEST_ID_SUFFIX}`)).toBeInTheDocument();
    expect(getByTestId(`test_id${ATTACK_STATUS_TEST_ID_SUFFIX}`)).toBeInTheDocument();
    expect(getByTestId(`test_id${ATTACK_STATUS_TEST_ID_SUFFIX}`)).toHaveTextContent(
      mockAttack.alertWorkflowStatus!
    );
    expect(getByTestId(`test_id${ATTACK_SPARKLES_ICON_TEST_ID_SUFFIX}`)).toBeInTheDocument();
    expect(getByTestId('mock-subtitle')).toBeInTheDocument();
  });

  it('should call openAttackDetailsFlyout when "Open attack details" button is clicked', () => {
    const openAttackDetailsFlyoutMock = jest.fn();
    const { getByTestId } = render(
      <AttackGroupContent
        attack={mockAttack}
        dataTestSubj="test_id"
        openAttackDetailsFlyout={openAttackDetailsFlyoutMock}
      />
    );

    const button = getByTestId(EXPAND_ATTACK_BUTTON_TEST_ID);
    expect(button).toBeInTheDocument();

    button.click();

    expect(openAttackDetailsFlyoutMock).toHaveBeenCalledTimes(1);
  });

  it('should render an empty state when the attack title is empty', () => {
    const attackWithEmptyTitle = { ...mockAttack, title: '' };
    const { getByTestId } = render(
      <AttackGroupContent
        attack={attackWithEmptyTitle}
        dataTestSubj="test_id"
        openAttackDetailsFlyout={jest.fn()}
      />
    );

    expect(getByTestId(`test_id${ATTACK_TITLE_TEST_ID_SUFFIX}`)).toBeEmptyDOMElement();
  });

  it('should show anonymized values in title when showAnonymized is true', () => {
    const { getByTestId } = render(
      <AttackGroupContent
        attack={mockAttack}
        dataTestSubj="test_id"
        showAnonymized
        openAttackDetailsFlyout={jest.fn()}
      />
    );

    expect(getByTestId(`test_id${ATTACK_TITLE_TEST_ID_SUFFIX}`)).toHaveTextContent(
      'Unix1 Malware and Credential Theft'
    );
  });

  it('should show original values in title when showAnonymized is false', () => {
    const { getByTestId } = render(
      <AttackGroupContent
        attack={mockAttack}
        dataTestSubj="test_id"
        showAnonymized={false}
        openAttackDetailsFlyout={jest.fn()}
      />
    );

    expect(getByTestId(`test_id${ATTACK_TITLE_TEST_ID_SUFFIX}`)).toHaveTextContent(
      'Unix1 Malware and Credential Theft'
    );
  });
});
