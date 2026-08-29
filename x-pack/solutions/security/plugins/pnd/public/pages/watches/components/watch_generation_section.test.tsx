/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import type { WatchGenerationSettings } from '@kbn/pnd-common';
import * as i18n from '../settings_translations';
import { WatchGenerationSection } from './watch_generation_section';

/**
 * The connector list is `useAdConnectors`' concern — a react-query read behind Kibana services —
 * so this suite mocks the hook and asserts only what the section renders from its answer.
 */
jest.mock('../../../components/ad_worker_config/use_ad_connectors', () => ({
  useAdConnectors: jest.fn(),
}));

const { useAdConnectors } = jest.requireMock(
  '../../../components/ad_worker_config/use_ad_connectors'
);

const generation: WatchGenerationSettings = {
  alertSize: 100,
  connectorId: '',
  lookback: 'now-24h',
};

const renderSection = ({
  generationOverrides,
}: { generationOverrides?: Partial<WatchGenerationSettings> } = {}) => {
  const onAlertSizeChange = jest.fn();
  const onLookbackChange = jest.fn();
  const onConnectorChange = jest.fn();

  render(
    <WatchGenerationSection
      generation={{ ...generation, ...generationOverrides }}
      onAlertSizeChange={onAlertSizeChange}
      onLookbackChange={onLookbackChange}
      onConnectorChange={onConnectorChange}
    />
  );

  return { onAlertSizeChange, onConnectorChange, onLookbackChange };
};

describe('WatchGenerationSection', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    useAdConnectors.mockReturnValue({
      data: [{ id: 'connector-a', name: 'GPT-4o' }],
      isLoading: false,
    });
  });

  it('shows the stored alert size', () => {
    renderSection();

    expect(screen.getByTestId('pndWatchGenerationAlertSize')).toHaveValue(100);
  });

  it("bounds the alert size at the route's limits", () => {
    renderSection();

    const field = screen.getByTestId('pndWatchGenerationAlertSize');
    expect(field).toHaveAttribute('min', '1');
    expect(field).toHaveAttribute('max', '500');
  });

  it('reports an alert-size edit as a number', () => {
    const { onAlertSizeChange } = renderSection();

    fireEvent.change(screen.getByTestId('pndWatchGenerationAlertSize'), {
      target: { value: '250' },
    });

    expect(onAlertSizeChange).toHaveBeenCalledWith(250);
  });

  it('shows the stored alert window', () => {
    renderSection();

    expect(screen.getByTestId('pndWatchGenerationLookbackSelect')).toHaveValue('now-24h');
  });

  it('offers the three alert windows by name', () => {
    renderSection();

    const options = Array.from(
      screen.getByTestId('pndWatchGenerationLookbackSelect').querySelectorAll('option')
    ).map((option) => option.textContent);

    expect(options).toEqual(['Last 24 hours', 'Last 48 hours', 'Last 7 days']);
  });

  /**
   * A stored window outside the offered list — a hand-edited document, or an older vocabulary — must
   * not be snapped to the first option by an untouched page, so it is appended as its own option.
   */
  it('keeps an unlisted stored window as an extra option, so it round-trips', () => {
    renderSection({ generationOverrides: { lookback: 'now-3d' } });

    expect(screen.getByTestId('pndWatchGenerationLookbackSelect')).toHaveValue('now-3d');
  });

  it('reports an alert-window edit', () => {
    const { onLookbackChange } = renderSection();

    fireEvent.change(screen.getByTestId('pndWatchGenerationLookbackSelect'), {
      target: { value: 'now-7d' },
    });

    expect(onLookbackChange).toHaveBeenCalledWith('now-7d');
  });

  it('reads the connectors offered for Attack Discovery', () => {
    renderSection();

    expect(useAdConnectors).toHaveBeenCalled();
  });

  it('offers the server-resolved default connector alongside the loaded ones', () => {
    renderSection();

    fireEvent.click(screen.getByTestId('pndWatchGenerationConnectorSelect'));
    const listbox = screen.getByRole('listbox');

    expect(listbox).toHaveTextContent(i18n.GENERATION_CONNECTOR_DEFAULT);
    expect(listbox).toHaveTextContent('GPT-4o');
  });

  it('shows the default connector for the empty stored id', () => {
    renderSection();

    expect(screen.getByTestId('pndWatchGenerationConnectorSelect')).toHaveTextContent(
      i18n.GENERATION_CONNECTOR_DEFAULT
    );
  });

  it('reports a connector selection by id', () => {
    const { onConnectorChange } = renderSection();

    fireEvent.click(screen.getByTestId('pndWatchGenerationConnectorSelect'));
    fireEvent.click(screen.getByText('GPT-4o'));

    expect(onConnectorChange).toHaveBeenCalledWith('connector-a');
  });

  it('reports the empty id when the default is selected back', () => {
    const { onConnectorChange } = renderSection({
      generationOverrides: { connectorId: 'connector-a' },
    });

    fireEvent.click(screen.getByTestId('pndWatchGenerationConnectorSelect'));
    fireEvent.click(screen.getByText(i18n.GENERATION_CONNECTOR_DEFAULT));

    expect(onConnectorChange).toHaveBeenCalledWith('');
  });
});
