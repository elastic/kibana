/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render } from '@testing-library/react';
import type { DataTableRecord } from '@kbn/discover-utils';
import { TestProviders } from '../../../../common/mock';
import { EventCategoryDescription } from './event_category_description';
import { EVENT_CATEGORY_DESCRIPTION_TEST_ID } from './test_ids';

const createMockHit = (flattened: DataTableRecord['flattened']): DataTableRecord =>
  ({
    id: '1',
    raw: {},
    flattened,
    isAnchor: false,
  } as DataTableRecord);

const renderDescription = (hit: DataTableRecord) =>
  render(
    <TestProviders>
      <EventCategoryDescription hit={hit} />
    </TestProviders>
  );

describe('<EventCategoryDescription />', () => {
  it('should render description for 1 category', () => {
    const hit = createMockHit({ 'event.category': 'file' });
    const { getByTestId } = renderDescription(hit);

    expect(getByTestId(`${EVENT_CATEGORY_DESCRIPTION_TEST_ID}-file`)).toBeInTheDocument();
  });

  it('should render description for multiple categories', () => {
    const hit = createMockHit({ 'event.category': ['file', 'network'] });
    const { getByTestId } = renderDescription(hit);

    expect(getByTestId(`${EVENT_CATEGORY_DESCRIPTION_TEST_ID}-file`)).toBeInTheDocument();
    expect(getByTestId(`${EVENT_CATEGORY_DESCRIPTION_TEST_ID}-network`)).toBeInTheDocument();
  });

  it('should render category name and fallback description if not ecs compliant', () => {
    const hit = createMockHit({ 'event.category': 'behavior' });
    const { getByTestId } = renderDescription(hit);

    expect(getByTestId(`${EVENT_CATEGORY_DESCRIPTION_TEST_ID}-behavior`)).toHaveTextContent(
      "BehaviorThis field doesn't have a description because it's not part of ECS."
    );
  });

  it('should render nothing when no categories are present', () => {
    const hit = createMockHit({});
    const { container } = renderDescription(hit);

    expect(container).toBeEmptyDOMElement();
  });
});
