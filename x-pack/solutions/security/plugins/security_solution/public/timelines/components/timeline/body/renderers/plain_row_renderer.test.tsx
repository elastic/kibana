/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { TimelineId } from '../../../../../../common/types/timeline';
import { mount, shallow } from 'enzyme';
import { cloneDeep } from 'lodash';
import React from 'react';

import type { EcsSecurityExtension as Ecs } from '@kbn/securitysolution-ecs';
import { mockTimelineData } from '../../../../../common/mock';
import { plainRowRenderer } from './plain_row_renderer';

describe('plain_row_renderer', () => {
  let mockDatum: Ecs;
  beforeEach(() => {
    mockDatum = cloneDeep(mockTimelineData[0].ecs);
  });

  test('renders correctly against snapshot', () => {
    const children = plainRowRenderer.renderRow({
      data: mockDatum,
      scopeId: TimelineId.test,
    });
    const wrapper = shallow(<span>{children}</span>);
    expect(wrapper).toMatchSnapshot();
  });

  test('should always return isInstance true', () => {
    expect(plainRowRenderer.isInstance(mockDatum)).toBe(true);
  });

  test('should render a plain row', () => {
    const children = plainRowRenderer.renderRow({
      data: mockDatum,
      scopeId: TimelineId.test,
    });
    const wrapper = mount(<span>{children}</span>);
    expect(wrapper.text()).toEqual('');
  });
});
