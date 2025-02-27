/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { shallow } from 'enzyme';
import React from 'react';

import { ItemDetailsAction, ItemDetailsCard, ItemDetailsPropertySummary } from '.';

describe('item_details_card', () => {
  describe('ItemDetailsPropertySummary', () => {
    it('should render correctly', () => {
      const element = shallow(<ItemDetailsPropertySummary name="name 1" value="value 1" />);

      expect(element).toMatchSnapshot();
    });
  });

  describe('ItemDetailsAction', () => {
    it('should render correctly', () => {
      const element = shallow(
        <ItemDetailsAction size="s" color="primary">
          {'primary'}
        </ItemDetailsAction>
      );

      expect(element).toMatchSnapshot();
    });
  });

  describe('ItemDetailsCard', () => {
    it('should render correctly with no actions', () => {
      const element = shallow(
        <ItemDetailsCard>
          <ItemDetailsPropertySummary name="name 1" value="value 1" />
          <ItemDetailsPropertySummary name="name 2" value="value 2" />
          <ItemDetailsPropertySummary name="name 3" value="value 3" />

          {'some text'}
          <strong>{'some node'}</strong>
        </ItemDetailsCard>
      );

      expect(element).toMatchSnapshot();
    });

    it('should render correctly with actions', () => {
      const element = shallow(
        <ItemDetailsCard>
          <ItemDetailsPropertySummary name="name 1" value="value 1" />
          <ItemDetailsPropertySummary name="name 2" value="value 2" />
          <ItemDetailsPropertySummary name="name 3" value="value 3" />

          {'some text'}
          <strong>{'some node'}</strong>

          <ItemDetailsAction size="s" color="primary">
            {'primary'}
          </ItemDetailsAction>
          <ItemDetailsAction size="s" color="success">
            {'success'}
          </ItemDetailsAction>
          <ItemDetailsAction size="s" color="danger">
            {'danger'}
          </ItemDetailsAction>
        </ItemDetailsCard>
      );

      expect(element).toMatchSnapshot();
    });
  });
});
