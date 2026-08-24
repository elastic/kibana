/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import type { AttackAttachmentMetadata } from '../../../../../common/cases/attachments/attack';
import { AttackChildren } from './attack_children';
import {
  ATTACK_ALERT_COUNT_TEST_ID,
  ATTACK_ENTITY_COUNT_TEST_ID,
  ATTACK_RISK_SCORE_TEST_ID,
  ATTACK_SUMMARY_TEST_ID,
  ATTACK_TITLE_TEST_ID,
} from '../../../../../common/cases/attachments/attack/test_ids';
import { TestProviders, kibanaMock } from '../../../../common/mock/test_providers';

const metadata: AttackAttachmentMetadata = {
  title: 'Credential harvesting on host-1',
  summaryMarkdown: 'An attacker dumped credentials from **host-1**.',
  riskScore: 73,
  alertCount: 4,
  entityCount: 2,
  index: '.alerts-security.attack.discovery.alerts-default',
};

describe('AttackChildren', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders every metadata field', () => {
    render(
      <TestProviders>
        <AttackChildren id="attack-id-1" metadata={metadata} />
      </TestProviders>
    );

    expect(screen.getByTestId(ATTACK_TITLE_TEST_ID)).toHaveTextContent(
      'Credential harvesting on host-1'
    );
    expect(screen.getByTestId(ATTACK_SUMMARY_TEST_ID)).toHaveTextContent(
      'An attacker dumped credentials from **host-1**.'
    );
    expect(screen.getByTestId(ATTACK_RISK_SCORE_TEST_ID)).toHaveTextContent('73');
    expect(screen.getByTestId(ATTACK_ALERT_COUNT_TEST_ID)).toHaveTextContent('4');
    expect(screen.getByTestId(ATTACK_ENTITY_COUNT_TEST_ID)).toHaveTextContent('2');
  });

  it('renders without crashing when the optional metadata fields are absent', () => {
    const partialMetadata = {
      title: 'Attack without optional metadata',
      alertCount: 0,
      index: '.adhoc.alerts-security.attack.discovery.alerts-default',
    } as AttackAttachmentMetadata;

    render(
      <TestProviders>
        <AttackChildren id="attack-id-1" metadata={partialMetadata} />
      </TestProviders>
    );

    expect(screen.getByTestId(ATTACK_TITLE_TEST_ID)).toHaveTextContent(
      'Attack without optional metadata'
    );
    expect(screen.queryByTestId(ATTACK_SUMMARY_TEST_ID)).not.toBeInTheDocument();
    expect(screen.queryByTestId(ATTACK_RISK_SCORE_TEST_ID)).not.toBeInTheDocument();
    expect(screen.queryByTestId(ATTACK_ENTITY_COUNT_TEST_ID)).not.toBeInTheDocument();
  });

  it('issues no data-fetching request when rendering', () => {
    const xhrOpenSpy = jest.spyOn(XMLHttpRequest.prototype, 'open');

    render(
      <TestProviders startServices={kibanaMock}>
        <AttackChildren id="attack-id-1" metadata={metadata} />
      </TestProviders>
    );

    expect(screen.getByTestId(ATTACK_TITLE_TEST_ID)).toBeInTheDocument();
    expect(xhrOpenSpy).not.toHaveBeenCalled();
    expect(kibanaMock.http.fetch).not.toHaveBeenCalled();
    expect(kibanaMock.http.get).not.toHaveBeenCalled();
    expect(kibanaMock.http.post).not.toHaveBeenCalled();

    xhrOpenSpy.mockRestore();
  });
});
