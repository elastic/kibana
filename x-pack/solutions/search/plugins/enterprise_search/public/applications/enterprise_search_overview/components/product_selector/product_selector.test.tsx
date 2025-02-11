/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { setMockValues } from '../../../__mocks__/kea_logic';

import React from 'react';

import { shallow } from 'enzyme';

import { TrialCallout } from '../trial_callout';

import { ElasticsearchProductCard } from './elasticsearch_product_card';

import { ProductSelector } from '.';

jest.mock('../../hooks/use_redirect_to_onboarding_start', () => ({
  useRedirectToOnboardingStart: jest.fn(() => ({ isChecking: false })),
}));

describe('ProductSelector', () => {
  it('renders the overview page, product cards, & setup guide CTAs with no host set', () => {
    setMockValues({ config: { host: '' } });
    const wrapper = shallow(<ProductSelector />);

    expect(wrapper.find(ElasticsearchProductCard)).toHaveLength(1);
  });

  it('renders the trial callout', () => {
    setMockValues({ config: { host: 'localhost' } });
    const wrapper = shallow(<ProductSelector />);

    expect(wrapper.find(TrialCallout)).toHaveLength(1);
  });

  describe('access checks when host is set', () => {
    beforeEach(() => {
      setMockValues({ config: { host: 'localhost' } });
    });

    it('does not render the Setup CTA when there is a host', () => {
      const wrapper = shallow(<ProductSelector />);

      expect(wrapper.find(ElasticsearchProductCard)).toHaveLength(1);
    });

    it('does not render EnterpriseSearch card without access', () => {
      const wrapper = shallow(<ProductSelector />);

      expect(wrapper.find(ElasticsearchProductCard)).toHaveLength(1);
    });
  });
});
