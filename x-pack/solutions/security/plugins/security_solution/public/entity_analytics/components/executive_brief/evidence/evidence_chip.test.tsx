/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { fireEvent, screen } from '@testing-library/react';
import { briefFixture, evidenceFixture } from '../__fixtures__/brief_fixture';
import { createBriefActions, renderBrief } from '../__fixtures__/render_brief';
import { EvidenceChip } from './evidence_chip';
import { HowFound } from './how_found';

const mockOpenRuleFlyout = jest.fn();

jest.mock('@kbn/expandable-flyout', () => ({
  useExpandableFlyoutApi: () => ({ openFlyout: jest.fn() }),
}));
jest.mock('../../../../common/hooks/use_is_new_flyout_enabled', () => ({
  useIsNewFlyoutEnabled: () => true,
}));
jest.mock('../../../../flyout_v2/use_flyout_api', () => ({
  useFlyoutApi: () => ({ openEntityFlyout: jest.fn(), openRuleFlyout: mockOpenRuleFlyout }),
}));
jest.mock('../../../../common/components/links', () => ({
  CaseDetailsLink: ({
    detailName,
    children,
  }: {
    detailName: string;
    children: React.ReactNode;
  }) => (
    <a href={`#/cases/${detailName}`} data-test-subj="caseLink">
      {children}
    </a>
  ),
}));

describe('EvidenceChip', () => {
  beforeEach(() => jest.clearAllMocks());

  it('opens the entity through the injected action', () => {
    const actions = createBriefActions();
    renderBrief(<EvidenceChip id="ENT-1" evidence={evidenceFixture} />, actions);

    fireEvent.click(screen.getByTestId('leadEntityBadge-a.rodriguez'));

    expect(actions.openEntity).toHaveBeenCalledTimes(1);
    expect(actions.openEntity).toHaveBeenCalledWith(evidenceFixture.entities['ENT-1']);
  });

  it('renders entities as plain badges when there are no actions', () => {
    renderBrief(<EvidenceChip id="ENT-1" evidence={evidenceFixture} />, null);

    expect(screen.getByText('a.rodriguez')).toBeInTheDocument();
    expect(screen.queryByRole('button')).not.toBeInTheDocument();
  });

  it('renders a case fact as a case link with its status', () => {
    renderBrief(<EvidenceChip id="F-11" evidence={evidenceFixture} />);

    expect(screen.getByTestId('caseLink')).toHaveAttribute('href', '#/cases/case-1');
    expect(screen.getByTestId('caseLink')).toHaveTextContent('Marketing account takeover');
    expect(screen.getByText('In progress')).toBeInTheDocument();
  });

  it('renders a case as text without actions', () => {
    renderBrief(<EvidenceChip id="F-11" evidence={evidenceFixture} />, null);

    expect(screen.queryByTestId('caseLink')).not.toBeInTheDocument();
    expect(screen.getByText('Marketing account takeover')).toBeInTheDocument();
  });

  it('renders a rule fact that opens the rule flyout', () => {
    renderBrief(<EvidenceChip id="F-8" evidence={evidenceFixture} />);

    fireEvent.click(screen.getByTestId('executiveBriefRuleChip'));

    expect(mockOpenRuleFlyout).toHaveBeenCalledWith({
      ruleId: 'rule-lateral-rdp',
      title: 'Lateral movement alerts on jump-box-01',
    });
  });

  it('renders attack discovery and lead facts as badges', () => {
    renderBrief(
      <>
        <EvidenceChip id="F-1" evidence={evidenceFixture} />
        <EvidenceChip id="F-6" evidence={evidenceFixture} />
      </>
    );

    expect(screen.getByTestId('executiveBriefAttackChip')).toHaveTextContent(
      'Privileged credential theft with lateral movement to production'
    );
    expect(screen.getByTestId('executiveBriefLeadChip')).toHaveTextContent(
      'Possible credential theft with lateral movement to production'
    );
  });

  it('describes a link with its fixed verb', () => {
    renderBrief(<EvidenceChip id="L-3" evidence={evidenceFixture} />);

    expect(screen.getByTestId('executiveBriefLinkChip')).toHaveTextContent(
      'a.rodriguez logged on to (rarely) jump-box-01'
    );
  });

  it.each(['ENT-99', 'F-99', 'L-99', 'X-1'])('renders nothing for the unknown id %s', (id) => {
    const { container } = renderBrief(<EvidenceChip id={id} evidence={evidenceFixture} />);

    expect(container).toBeEmptyDOMElement();
  });
});

describe('HowFound', () => {
  it('renders one chip per capability behind the threat', () => {
    renderBrief(<HowFound threat={briefFixture.threats[2]} evidence={evidenceFixture} />);

    expect(screen.getByTestId('executiveBriefHowFound-detections')).toHaveTextContent('Detections');
    expect(screen.getByTestId('executiveBriefHowFound-relationships')).toHaveTextContent(
      'Relationships'
    );
    expect(screen.queryByTestId('executiveBriefHowFound-attack_discovery')).not.toBeInTheDocument();
  });

  it('names every capability for the planted campaign', () => {
    renderBrief(<HowFound threat={briefFixture.threats[0]} evidence={evidenceFixture} />);

    [
      'Attack Discovery',
      'Risk scoring',
      'Asset criticality',
      'Watchlists',
      'Entity resolution',
      'Hunting leads',
    ].forEach((label) => expect(screen.getByText(label)).toBeInTheDocument());
  });
});
