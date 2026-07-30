/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ATTACK_DISCOVERY_AD_HOC_RULE_ID } from '@kbn/elastic-assistant-common';
import { useBulkGetUserProfiles } from '../../../../../common/components/user_profiles/use_bulk_get_user_profiles';
import { getSummaryPlainText, Subtitle } from './subtitle';
import { getMockAttackDiscoveryAlerts } from '../../../../../attack_discovery/pages/mock/mock_attack_discovery_alerts';

import { getFormattedDate } from '../../../../../attack_discovery/pages/loading_callout/loading_messages/get_formatted_time';

jest.mock(
  '../../../../../attack_discovery/pages/loading_callout/loading_messages/get_formatted_time',
  () => ({
    getFormattedDate: jest.fn(() => '2023-10-27 10:00:00'),
  })
);

jest.mock('../../../../../common/lib/kibana', () => ({
  useDateFormat: jest.fn(() => jest.fn()),
}));

jest.mock(
  '../../../../../attack_discovery/pages/results/attack_discovery_markdown_formatter',
  () => ({
    AttackDiscoveryMarkdownFormatter: jest.fn(({ markdown, alertIds }) => (
      <div data-test-subj="mock-markdown-formatter" data-alert-ids={JSON.stringify(alertIds)}>
        {markdown}
      </div>
    )),
  })
);

jest.mock('../../../../../common/components/user_profiles/use_bulk_get_user_profiles', () => ({
  useBulkGetUserProfiles: jest.fn(),
}));

const mockAttack = getMockAttackDiscoveryAlerts()[0];

describe('getSummaryPlainText', () => {
  it('should strip field markdown syntax and keep field values', () => {
    expect(
      getSummaryPlainText(
        'Malware and credential theft detected on {{ host.name SRVMAC08 }} by {{ user.name james }}.'
      )
    ).toBe('Malware and credential theft detected on SRVMAC08 by james.');
  });

  it('should return the original string when there is no field markdown', () => {
    expect(getSummaryPlainText('Plain summary without fields.')).toBe(
      'Plain summary without fields.'
    );
  });
});

describe('Subtitle', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (getFormattedDate as jest.Mock).mockReturnValue('2023-10-27 10:00:00');
    (useBulkGetUserProfiles as jest.Mock).mockReturnValue({ data: [] });
  });

  it('should render with formatted date and summary for scheduled attacks', () => {
    const scheduledAttack = { ...mockAttack, alertRuleUuid: 'some_other_rule_id' };
    const { getByTestId } = render(<Subtitle attack={scheduledAttack} />);

    expect(getByTestId('attack-subtitle')).toHaveTextContent(
      'Detected on 2023-10-27 10:00:00|Malware and credential theft detected on {{ host.name SRVMAC08 }} by {{ user.name james }}.'
    );
    expect(getByTestId('mock-markdown-formatter')).toHaveTextContent(
      'Malware and credential theft detected on {{ host.name SRVMAC08 }} by {{ user.name james }}.'
    );
  });

  it('should show full plain-text summary in tooltip on hover', async () => {
    const user = userEvent.setup();
    const scheduledAttack = { ...mockAttack, alertRuleUuid: 'some_other_rule_id' };
    render(<Subtitle attack={scheduledAttack} />);

    await user.hover(screen.getByTestId('mock-markdown-formatter'));

    expect(await screen.findByRole('tooltip')).toHaveTextContent(
      'Malware and credential theft detected on SRVMAC08 by james.'
    );
  });

  it('should render with formatted date only if summary is missing', () => {
    const attackWithoutSummary = {
      ...mockAttack,
      alertRuleUuid: 'some_other_rule_id',
      entitySummaryMarkdown: undefined,
    };
    const { getByTestId, queryByTestId } = render(<Subtitle attack={attackWithoutSummary} />);

    expect(getByTestId('attack-subtitle')).toHaveTextContent('Detected on 2023-10-27 10:00:00');
    expect(queryByTestId('mock-markdown-formatter')).not.toBeInTheDocument();
    expect(queryByTestId('attack-subtitle-summary')).not.toBeInTheDocument();
  });

  it('should render anonymized summary when showAnonymized is true', () => {
    const scheduledAttack = { ...mockAttack, alertRuleUuid: 'some_other_rule_id' };
    const { getByTestId } = render(<Subtitle attack={scheduledAttack} showAnonymized={true} />);

    expect(getByTestId('mock-markdown-formatter')).toHaveTextContent(
      'Malware and credential theft detected on {{ host.name 3d241119-f77a-454e-8ee3-d36e05a8714f }} by {{ user.name 325761dd-b22b-4fdc-8444-a4ef66d76380 }}.'
    );
  });

  it('should render only summary if formatted date is missing', () => {
    (getFormattedDate as jest.Mock).mockReturnValue(null);
    const scheduledAttack = { ...mockAttack, alertRuleUuid: 'some_other_rule_id' };
    const { getByTestId } = render(<Subtitle attack={scheduledAttack} />);

    expect(getByTestId('mock-markdown-formatter')).toHaveTextContent(
      'Malware and credential theft detected on {{ host.name SRVMAC08 }} by {{ user.name james }}.'
    );
    expect(getByTestId('attack-subtitle')).not.toHaveTextContent('Detected on');
    expect(getByTestId('attack-subtitle')).not.toHaveTextContent('|');
  });

  it('should render with avatar and "Run by" section for manually generated attacks', () => {
    const manualAttack = {
      ...mockAttack,
      alertRuleUuid: ATTACK_DISCOVERY_AD_HOC_RULE_ID,
      userName: 'test_user',
    };
    const { getByTestId } = render(<Subtitle attack={manualAttack} />);

    expect(getByTestId('attack-subtitle')).toHaveTextContent('Detected on 2023-10-27 10:00:00');
    expect(getByTestId('attack-subtitle')).toHaveTextContent('Run by:');
    expect(getByTestId('attack-subtitle')).toHaveTextContent('|');
    expect(getByTestId('attack-run-by-avatar')).toBeInTheDocument();
  });

  it('should render with "Unknown" user if userName is missing for manually generated attacks', () => {
    const manualAttack = {
      ...mockAttack,
      alertRuleUuid: ATTACK_DISCOVERY_AD_HOC_RULE_ID,
      userName: undefined,
    };
    const { getByTestId } = render(<Subtitle attack={manualAttack} />);

    expect(getByTestId('attack-subtitle')).toHaveTextContent('Detected on 2023-10-27 10:00:00');
    expect(getByTestId('attack-subtitle')).toHaveTextContent('Run by:');
    expect(getByTestId('attack-subtitle')).toHaveTextContent('|');
    expect(getByTestId('attack-run-by-avatar')).toBeInTheDocument();
  });

  it('should render avatar image if profile is available for manually generated attacks with userId', () => {
    (useBulkGetUserProfiles as jest.Mock).mockReturnValue({
      data: [
        {
          user: { uid: 'test-user-id', full_name: 'test_user' },
          data: { avatar: { imageUrl: 'http://example.com/avatar.png' } },
        },
      ],
    });
    const manualAttack = {
      ...mockAttack,
      alertRuleUuid: ATTACK_DISCOVERY_AD_HOC_RULE_ID,
      userId: 'test-user-id',
      userName: 'test_user',
    };
    const { getByTestId } = render(<Subtitle attack={manualAttack} />);

    expect(getByTestId('attack-run-by-avatar')).toBeInTheDocument();
    expect(getByTestId('attack-run-by-avatar')).toHaveStyle(
      'background-image: url(http://example.com/avatar.png)'
    );
  });

  it('should render avatar placeholder if profile is not yet loaded for manually generated attacks with userId', () => {
    (useBulkGetUserProfiles as jest.Mock).mockReturnValue({
      data: undefined,
    });
    const manualAttack = {
      ...mockAttack,
      alertRuleUuid: ATTACK_DISCOVERY_AD_HOC_RULE_ID,
      userId: 'test-user-id',
      userName: 'test_user',
    };
    const { getByTestId } = render(<Subtitle attack={manualAttack} />);

    expect(getByTestId('attack-run-by-avatar')).toBeInTheDocument();
    expect(getByTestId('attack-run-by-avatar')).toHaveTextContent('?');
  });

  it('should pass originalAlertIds to AttackDiscoveryMarkdownFormatter', () => {
    const scheduledAttack = {
      ...mockAttack,
      alertRuleUuid: 'some_other_rule_id',
      alertIds: ['alert-1', 'alert-2'],
      replacements: { 'alert-1': 'original-1' },
    };
    const { getByTestId } = render(<Subtitle attack={scheduledAttack} />);

    expect(getByTestId('mock-markdown-formatter')).toHaveAttribute(
      'data-alert-ids',
      JSON.stringify(['original-1', 'alert-2'])
    );
  });
});
