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
import { EventKindDescription } from './event_kind_description';
import {
  EVENT_KIND_DESCRIPTION_CATEGORIES_TEST_ID,
  EVENT_KIND_DESCRIPTION_TEST_ID,
  EVENT_KIND_DESCRIPTION_TEXT_TEST_ID,
} from './test_ids';

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
      <EventKindDescription hit={hit} />
    </TestProviders>
  );

describe('<EventKindDescription />', () => {
  describe('event kind description section', () => {
    it('should render event kind title', () => {
      const hit = createMockHit({ 'event.kind': 'alert' });
      const { getByTestId } = renderDescription(hit);

      expect(getByTestId(EVENT_KIND_DESCRIPTION_TEST_ID)).toBeInTheDocument();
      expect(getByTestId(EVENT_KIND_DESCRIPTION_TEXT_TEST_ID)).toHaveTextContent('Alert');
    });
  });

  describe('event categories section', () => {
    it('should render event category correctly for 1 category', () => {
      const hit = createMockHit({ 'event.kind': 'alert', 'event.category': 'behavior' });
      const { getByTestId } = renderDescription(hit);

      expect(getByTestId(EVENT_KIND_DESCRIPTION_CATEGORIES_TEST_ID)).toHaveTextContent('behavior');
    });

    it('should render event category for multiple categories', () => {
      const hit = createMockHit({
        'event.kind': 'alert',
        'event.category': ['session', 'authentication'],
      });
      const { getByTestId } = renderDescription(hit);

      expect(getByTestId(EVENT_KIND_DESCRIPTION_CATEGORIES_TEST_ID)).toHaveTextContent(
        'session,authentication'
      );
    });

    it('should not render category name if not available', () => {
      const hit = createMockHit({ 'event.kind': 'alert' });
      const { queryByTestId } = renderDescription(hit);

      expect(queryByTestId(EVENT_KIND_DESCRIPTION_CATEGORIES_TEST_ID)).not.toBeInTheDocument();
    });
  });
});
