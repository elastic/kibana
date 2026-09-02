/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { fireEvent, render, screen, within } from '@testing-library/react';
import { EuiProvider } from '@elastic/eui';
import { I18nProvider } from '@kbn/i18n-react';
import { ImpactedServices, MAX_VISIBLE_IMPACTED_SERVICES } from './impacted_services';
import type { ImpactedServiceChip } from './impacted_services_chips';

const buildServices = (count: number): ImpactedServiceChip[] =>
  Array.from({ length: count }, (_, index) => ({
    key: `entity:${index}`,
    name: `entity-${index}`,
    count: index + 1,
  }));

const renderServices = (selectedServiceKey?: string) =>
  render(
    <I18nProvider>
      <EuiProvider>
        <ImpactedServices
          services={buildServices(MAX_VISIBLE_IMPACTED_SERVICES + 2)}
          onSelect={jest.fn()}
          selectedServiceKey={selectedServiceKey}
        />
      </EuiProvider>
    </I18nProvider>
  );

const renderState = (props: Partial<React.ComponentProps<typeof ImpactedServices>>) =>
  render(
    <I18nProvider>
      <EuiProvider>
        <ImpactedServices services={[]} onSelect={jest.fn()} {...props} />
      </EuiProvider>
    </I18nProvider>
  );

describe('ImpactedServices', () => {
  it('keeps a selected overflow chip visible after collapsing', () => {
    const selectedKey = `entity:${MAX_VISIBLE_IMPACTED_SERVICES}`;
    renderServices(selectedKey);

    fireEvent.click(screen.getByTestId('impacted-services-show-more'));
    expect(screen.getByRole('button', { name: /entity-10: 11/i })).toBeInTheDocument();

    fireEvent.click(screen.getByTestId('impacted-services-show-less'));

    const chips = screen.getAllByTestId('impacted-services-chip');
    expect(chips).toHaveLength(MAX_VISIBLE_IMPACTED_SERVICES);
    expect(
      within(screen.getByRole('button', { name: /entity-10: 11/i })).getByText('entity-10')
    ).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /entity-10: 11/i })).toHaveAttribute(
      'aria-pressed',
      'true'
    );
  });

  it('renders nothing when there is no impact and nothing is pending', () => {
    const { container } = renderState({});

    expect(container).toBeEmptyDOMElement();
  });
});
