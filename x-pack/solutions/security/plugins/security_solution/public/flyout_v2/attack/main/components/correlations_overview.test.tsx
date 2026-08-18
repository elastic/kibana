/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import { EuiProvider } from '@elastic/eui';
import { CorrelationsOverview } from './correlations_overview';
import { INSIGHTS_CORRELATIONS_TEST_ID } from '../constants/test_ids';

jest.mock('@kbn/i18n-react', () => ({
  FormattedMessage: ({ defaultMessage, id }: { defaultMessage: string; id: string }) => (
    <span data-testid={id}>{defaultMessage}</span>
  ),
}));

jest.mock('./section_panel', () => ({
  SectionPanel: ({
    children,
    title,
    'data-test-subj': dataTestSubj,
    link,
  }: {
    children: React.ReactNode;
    title: React.ReactNode;
    'data-test-subj'?: string;
    link?: { callback: () => void; tooltip: React.ReactNode } | undefined;
  }) => (
    <div data-test-subj={dataTestSubj}>
      {link ? (
        <button data-test-subj={`${dataTestSubj}TitleLink`} onClick={link.callback} type="button">
          {title}
        </button>
      ) : (
        <div data-test-subj={`${dataTestSubj}TitleText`}>{title}</div>
      )}
      {children}
    </div>
  ),
}));

const renderWithEui = (ui: React.ReactElement) => render(<EuiProvider>{ui}</EuiProvider>);

describe('CorrelationsOverview (v2)', () => {
  it('renders the section with the correlations test id', () => {
    renderWithEui(
      <CorrelationsOverview alertIds={['alert-1', 'alert-2']} onShowCorrelations={jest.fn()} />
    );

    expect(screen.getByTestId(INSIGHTS_CORRELATIONS_TEST_ID)).toBeInTheDocument();
  });

  it('renders the Related alerts label', () => {
    renderWithEui(<CorrelationsOverview alertIds={['alert-1']} onShowCorrelations={jest.fn()} />);

    expect(screen.getByText('Related alerts')).toBeInTheDocument();
  });

  it('renders the related alerts count in a badge', () => {
    renderWithEui(
      <CorrelationsOverview alertIds={['alert-1', 'alert-2']} onShowCorrelations={jest.fn()} />
    );

    expect(screen.getByText('2')).toBeInTheDocument();
  });

  it('renders count of zero when alertIds is empty', () => {
    renderWithEui(<CorrelationsOverview alertIds={[]} onShowCorrelations={jest.fn()} />);

    expect(screen.getByText('0')).toBeInTheDocument();
  });

  it('renders count matching the length of alertIds', () => {
    renderWithEui(
      <CorrelationsOverview alertIds={['id-1', 'id-2', 'id-3']} onShowCorrelations={jest.fn()} />
    );

    expect(screen.getByText('3')).toBeInTheDocument();
  });

  it('renders the title as a link that invokes onShowCorrelations', () => {
    const onShowCorrelations = jest.fn();
    renderWithEui(
      <CorrelationsOverview alertIds={['alert-1']} onShowCorrelations={onShowCorrelations} />
    );

    const link = screen.getByTestId(`${INSIGHTS_CORRELATIONS_TEST_ID}TitleLink`);
    expect(link).toBeInTheDocument();
    link.click();
    expect(onShowCorrelations).toHaveBeenCalledTimes(1);
  });
});
