/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { shallow } from 'enzyme';
import { cloneDeep } from 'lodash/fp';
import React from 'react';
import type { TimelineNonEcsData } from '../../../../../../common/search_strategy/timeline';
import { defaultHeaders, mockTimelineData, TestProviders } from '../../../../../common/mock';
import { useMountAppended } from '../../../../../common/utils/use_mount_appended';
import { getEmptyValue } from '../../../../../common/components/empty_value';
import { deleteItemIdx, findItem } from './helpers';
import { emptyColumnRenderer } from './empty_column_renderer';

jest.mock('../../../../../common/lib/kibana');

describe('empty_column_renderer', () => {
  let mockDatum: TimelineNonEcsData[];
  const _id = mockTimelineData[0]._id;
  const mount = useMountAppended();

  beforeEach(() => {
    mockDatum = cloneDeep(mockTimelineData[0].data);
  });

  test('renders correctly against snapshot', () => {
    mockDatum = deleteItemIdx(mockDatum, findItem(mockDatum, 'source.ip'));
    const sourceObj = mockDatum.find((d) => d.field === 'source.ip');
    const emptyColumn = emptyColumnRenderer.renderColumn({
      columnName: 'source.ip',
      eventId: _id,
      values: sourceObj != null ? sourceObj.value : undefined,
      field: defaultHeaders.find((h) => h.id === 'source.ip')!,
      scopeId: 'test',
    });
    const wrapper = shallow(<span>{emptyColumn}</span>);
    expect(wrapper).toMatchSnapshot();
  });

  test('should return isInstance true if source is empty', () => {
    mockDatum = deleteItemIdx(mockDatum, findItem(mockDatum, 'source.ip'));
    expect(emptyColumnRenderer.isInstance('source', mockDatum)).toBe(true);
  });

  test('should return isInstance true if source.ip is empty', () => {
    mockDatum = deleteItemIdx(mockDatum, findItem(mockDatum, 'source.ip'));
    expect(emptyColumnRenderer.isInstance('source.ip', mockDatum)).toBe(true);
  });

  test('should return isInstance false if source.ip is NOT empty', () => {
    expect(emptyColumnRenderer.isInstance('source.ip', mockDatum)).toBe(false);
  });

  test('should return isInstance true if it encounters a column it does not know about', () => {
    expect(emptyColumnRenderer.isInstance('made up name', mockDatum)).toBe(true);
  });

  test('should return an empty value', () => {
    mockDatum = deleteItemIdx(mockDatum, findItem(mockDatum, 'source.ip'));
    const emptyColumn = emptyColumnRenderer.renderColumn({
      columnName: 'source.ip',
      eventId: _id,
      values: null,
      field: defaultHeaders.find((h) => h.id === 'source.ip')!,
      scopeId: 'test',
    });
    const wrapper = mount(
      <TestProviders>
        <span>{emptyColumn}</span>
      </TestProviders>
    );

    expect(wrapper.text()).toEqual(getEmptyValue());
  });
});
