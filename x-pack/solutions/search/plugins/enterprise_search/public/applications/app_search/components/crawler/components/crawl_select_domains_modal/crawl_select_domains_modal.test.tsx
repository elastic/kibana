/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { setMockActions, setMockValues } from '../../../../../__mocks__/kea_logic';

import React from 'react';

import { shallow, ShallowWrapper } from 'enzyme';

import { EuiModal, EuiModalFooter, EuiButton, EuiButtonEmpty } from '@elastic/eui';

import { rerender } from '../../../../../test_helpers';

import { CrawlSelectDomainsModal } from './crawl_select_domains_modal';
import { SimplifiedSelectable } from './simplified_selectable';

const MOCK_VALUES = {
  // CrawlerLogic
  domains: [{ url: 'https://www.elastic.co' }, { url: 'https://www.swiftype.com' }],
  // CrawlSelectDomainsModalLogic
  selectedDomainUrls: ['https://www.elastic.co'],
  isModalVisible: true,
};

const MOCK_ACTIONS = {
  // CrawlSelectDomainsModalLogic
  hideModal: jest.fn(),
  onSelectDomainUrls: jest.fn(),
  // CrawlerLogic
  startCrawl: jest.fn(),
};

describe('CrawlSelectDomainsModal', () => {
  let wrapper: ShallowWrapper;

  beforeEach(() => {
    jest.clearAllMocks();
    setMockValues(MOCK_VALUES);
    setMockActions(MOCK_ACTIONS);

    wrapper = shallow(<CrawlSelectDomainsModal />);
  });

  it('is empty when the modal is hidden', () => {
    setMockValues({
      ...MOCK_VALUES,
      isModalVisible: false,
    });

    rerender(wrapper);

    expect(wrapper.isEmptyRender()).toBe(true);
  });

  it('renders as a modal when visible', () => {
    expect(wrapper.is(EuiModal)).toBe(true);
  });

  it('can be closed', () => {
    expect(wrapper.prop('onClose')).toEqual(MOCK_ACTIONS.hideModal);
    expect(wrapper.find(EuiModalFooter).find(EuiButtonEmpty).prop('onClick')).toEqual(
      MOCK_ACTIONS.hideModal
    );
  });

  it('allows the user to select domains', () => {
    expect(wrapper.find(SimplifiedSelectable).props()).toEqual({
      options: ['https://www.elastic.co', 'https://www.swiftype.com'],
      selectedOptions: ['https://www.elastic.co'],
      onChange: MOCK_ACTIONS.onSelectDomainUrls,
    });
  });

  describe('submit button', () => {
    it('is disabled when no domains are selected', () => {
      setMockValues({
        ...MOCK_VALUES,
        selectedDomainUrls: [],
      });

      rerender(wrapper);

      expect(wrapper.find(EuiModalFooter).find(EuiButton).prop('disabled')).toEqual(true);
    });

    it('starts a crawl and hides the modal', () => {
      wrapper.find(EuiModalFooter).find(EuiButton).simulate('click');

      expect(MOCK_ACTIONS.startCrawl).toHaveBeenCalledWith({
        domain_allowlist: MOCK_VALUES.selectedDomainUrls,
      });
    });
  });
});
