/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { cloneDeep } from 'lodash/fp';
import React from 'react';
import { render } from '@testing-library/react';

import type { TimelineNonEcsData } from '../../../../../../common/search_strategy/timeline';
import { mockTimelineData } from '../../../../../common/mock';
import { TestProviders } from '../../../../../common/mock/test_providers';
import { getEmptyValue } from '../../../../../common/components/empty_value';

import { columnRenderers } from '.';
import { getColumnRenderer } from './get_column_renderer';
import { getValues, findItem, deleteItemIdx } from './helpers';
import { TimelineId } from '../../../../../../common/types/timeline';
import { defaultUdtHeaders } from '../column_headers/default_headers';

jest.mock('../../../../../common/lib/kibana');

jest.mock('@elastic/eui', () => {
  const original = jest.requireActual('@elastic/eui');
  return {
    ...original,
    EuiScreenReaderOnly: () => <></>,
  };
});

describe('get_column_renderer', () => {
  let nonSuricata: TimelineNonEcsData[];
  const _id = mockTimelineData[0]._id;

  beforeEach(() => {
    nonSuricata = cloneDeep(mockTimelineData[0].data);
  });

  test('should render event severity when dealing with data that is not suricata', () => {
    const columnName = 'event.severity';
    const columnRenderer = getColumnRenderer(columnName, columnRenderers, nonSuricata);
    const column = columnRenderer.renderColumn({
      columnName,
      eventId: _id,
      values: getValues(columnName, nonSuricata),
      field: defaultUdtHeaders[1],
      scopeId: TimelineId.test,
    });
    const { container } = render(
      <TestProviders>
        <span>{column}</span>
      </TestProviders>
    );
    expect(container).toHaveTextContent(/^3$/);
  });

  test('should render empty value when dealing with an empty value of user', () => {
    const columnName = 'user.name';
    const idx = findItem(nonSuricata, columnName);
    nonSuricata = deleteItemIdx(nonSuricata, idx);
    const columnRenderer = getColumnRenderer(columnName, columnRenderers, nonSuricata);
    const column = columnRenderer.renderColumn({
      columnName,
      eventId: _id,
      values: getValues(columnName, nonSuricata),
      field: defaultUdtHeaders[7],
      scopeId: TimelineId.test,
    });
    const { container } = render(
      <TestProviders>
        <span>{column}</span>
      </TestProviders>
    );
    expect(container).toHaveTextContent(new RegExp(`^${getEmptyValue()}$`));
  });

  test('should render empty value when dealing with an unknown column name', () => {
    const columnName = 'something made up';
    const columnRenderer = getColumnRenderer(columnName, columnRenderers, nonSuricata);
    const column = columnRenderer.renderColumn({
      columnName,
      eventId: _id,
      values: getValues(columnName, nonSuricata),
      field: defaultUdtHeaders[7],
      scopeId: TimelineId.test,
    });
    const { container } = render(
      <TestProviders>
        <span>{column}</span>
      </TestProviders>
    );
    expect(container).toHaveTextContent(new RegExp(`^${getEmptyValue()}$`));
  });
});
