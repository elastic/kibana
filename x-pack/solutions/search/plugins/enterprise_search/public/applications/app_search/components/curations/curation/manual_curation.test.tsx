/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import '../../../../__mocks__/shallow_useeffect.mock';
import { setMockActions, setMockValues } from '../../../../__mocks__/kea_logic';
import { mockUseParams } from '../../../../__mocks__/react_router';
import '../../../__mocks__/engine_logic.mock';

import React from 'react';

import { shallow, ShallowWrapper } from 'enzyme';

import { EuiTab } from '@elastic/eui';

import { getPageTitle, getPageHeaderActions, getPageHeaderTabs } from '../../../../test_helpers';

jest.mock('./curation_logic', () => ({ CurationLogic: jest.fn() }));
import { CurationLogic } from './curation_logic';

import { DeleteCurationButton } from './delete_curation_button';
import { PromotedDocuments, HiddenDocuments, OrganicDocuments } from './documents';
import { ManualCuration } from './manual_curation';
import { ActiveQuerySelect, ManageQueriesModal } from './queries';
import { AddResultFlyout } from './results';
import { SuggestedDocumentsCallout } from './suggested_documents_callout';

describe('ManualCuration', () => {
  const values = {
    queries: ['query A', 'query B'],
    isFlyoutOpen: false,
    selectedPageTab: 'promoted',
    curation: {
      promoted: [],
      hidden: [],
    },
  };
  const actions = {
    deleteCuration: jest.fn(),
    onSelectPageTab: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
    setMockValues(values);
    setMockActions(actions);
  });

  it('renders a view for managing a curation', () => {
    const wrapper = shallow(<ManualCuration />);

    expect(getPageTitle(wrapper)).toEqual('Manage curation');
    expect(wrapper.prop('pageChrome')).toEqual([
      'Engines',
      'some-engine',
      'Curations',
      'query A, query B',
    ]);
  });

  it('includes set of tabs in the page header', () => {
    const wrapper = shallow(<ManualCuration />);

    const tabs = getPageHeaderTabs(wrapper).find(EuiTab);

    tabs.at(0).simulate('click');
    expect(actions.onSelectPageTab).toHaveBeenNthCalledWith(1, 'promoted');

    tabs.at(1).simulate('click');
    expect(actions.onSelectPageTab).toHaveBeenNthCalledWith(2, 'hidden');
  });

  it('contains a suggested documents callout', () => {
    const wrapper = shallow(<ManualCuration />);

    expect(wrapper.find(SuggestedDocumentsCallout)).toHaveLength(1);
  });

  it('renders promoted and organic documents when the promoted tab is selected', () => {
    setMockValues({ ...values, selectedPageTab: 'promoted' });
    const wrapper = shallow(<ManualCuration />);
    const tabs = getPageHeaderTabs(wrapper).find(EuiTab);

    expect(tabs.at(0).prop('isSelected')).toEqual(true);

    expect(wrapper.find(PromotedDocuments)).toHaveLength(1);
    expect(wrapper.find(OrganicDocuments)).toHaveLength(1);
  });

  it('renders hidden documents when the hidden tab is selected', () => {
    setMockValues({ ...values, selectedPageTab: 'hidden' });
    const wrapper = shallow(<ManualCuration />);
    const tabs = getPageHeaderTabs(wrapper).find(EuiTab);

    expect(tabs.at(1).prop('isSelected')).toEqual(true);

    expect(wrapper.find(HiddenDocuments)).toHaveLength(1);
  });

  it('renders the add result flyout when open', () => {
    setMockValues({ ...values, isFlyoutOpen: true });
    const wrapper = shallow(<ManualCuration />);

    expect(wrapper.find(AddResultFlyout)).toHaveLength(1);
  });

  it('initializes CurationLogic with a curationId prop from URL param', () => {
    mockUseParams.mockReturnValueOnce({ curationId: 'hello-world' });
    shallow(<ManualCuration />);

    expect(CurationLogic).toHaveBeenCalledWith({ curationId: 'hello-world' });
  });

  describe('page header actions', () => {
    let pageHeaderActions: ShallowWrapper;

    beforeAll(() => {
      const wrapper = shallow(<ManualCuration />);
      pageHeaderActions = getPageHeaderActions(wrapper);
    });

    it('contains a button to manage queries and an active query selector', () => {
      expect(pageHeaderActions.find(ManageQueriesModal)).toHaveLength(1);
    });

    it('contains a button to delete the curation', () => {
      expect(pageHeaderActions.find(DeleteCurationButton)).toHaveLength(1);
    });
  });

  it('contains an active query selector', () => {
    const wrapper = shallow(<ManualCuration />);

    expect(wrapper.find(ActiveQuerySelect)).toHaveLength(1);
  });
});
