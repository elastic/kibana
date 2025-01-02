/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  setMockValues,
  setMockActions,
  mockKibanaValues,
} from '../../../../../__mocks__/kea_logic';
import '../../_mocks_/index_name_logic.mock';

import React from 'react';

import { shallow, ShallowWrapper } from 'enzyme';

import { EuiBasicTable, EuiButtonIcon } from '@elastic/eui';

import { mountWithIntl } from '@kbn/test-jest-helpers';

import { DEFAULT_META } from '../../../../../shared/constants';
import { CrawlerDomain } from '../../../../api/crawler/types';

import { DomainsTable } from './domains_table';

const domains: CrawlerDomain[] = [
  {
    id: '1234',
    documentCount: 9999,
    url: 'elastic.co',
    crawlRules: [],
    entryPoints: [],
    sitemaps: [],
    lastCrawl: '2020-01-01T00:00:00-12:00',
    createdOn: '2020-01-01T00:00:00-12:00',
    deduplicationEnabled: false,
    deduplicationFields: ['title'],
    extractionRules: [],
    availableDeduplicationFields: ['title', 'description'],
    auth: null,
  },
  {
    id: '4567',
    documentCount: 0,
    url: 'empty.site',
    crawlRules: [],
    entryPoints: [],
    extractionRules: [],
    sitemaps: [],
    createdOn: '1970-01-01T00:00:00-12:00',
    deduplicationEnabled: false,
    deduplicationFields: ['title'],
    availableDeduplicationFields: ['title', 'description'],
    auth: null,
  },
];

const values = {
  // IndexNameLogic
  indexName: 'index-name',
  // CrawlerDomainsLogic
  domains,
  meta: DEFAULT_META,
  dataLoading: false,
  // AppLogic
  myRole: { canManageEngineCrawler: false },
};

const actions = {
  // CrawlerDomainsLogic
  fetchCrawlerDomainsData: jest.fn(),
  onPaginate: jest.fn(),
  // DeleteDomainModalLogic
  showModal: jest.fn(),
};

describe('DomainsTable', () => {
  let wrapper: ShallowWrapper;
  let tableContent: string;

  beforeEach(() => {
    jest.clearAllMocks();
  });

  beforeAll(() => {
    setMockValues(values);
    setMockActions(actions);
    wrapper = shallow(<DomainsTable />);
    tableContent = mountWithIntl(<DomainsTable />)
      .find(EuiBasicTable)
      .text();
  });

  const getTableBody = () =>
    // @ts-expect-error upgrade typescript v5.1.6
    wrapper.find(EuiBasicTable).dive().find('RenderWithEuiTheme').renderProp('children')();

  it('renders', () => {
    expect(wrapper.find(EuiBasicTable)).toHaveLength(1);

    expect(wrapper.find(EuiBasicTable).prop('pagination')).toEqual({
      showPerPageOptions: false,
      pageIndex: 0,
      pageSize: 10,
      totalItemCount: 0,
    });

    wrapper.find(EuiBasicTable).simulate('change', { page: { index: 2 } });
    expect(actions.onPaginate).toHaveBeenCalledWith(3);
  });

  describe('columns', () => {
    it('renders a url column', () => {
      expect(tableContent).toContain('elastic.co');
    });

    it('renders a clickable domain url', () => {
      const link = getTableBody().find('[data-test-subj="CrawlerDomainURL"]').at(0);

      expect(link.dive().text()).toContain('elastic.co');
      expect(link.props()).toEqual(
        expect.objectContaining({
          to: '/search_indices/index-name/domain_management/1234',
        })
      );
    });

    it('renders a last crawled column', () => {
      expect(tableContent).toContain('Last activity');
      expect(tableContent).toContain('Jan 1, 2020');
    });

    it('renders a document count column', () => {
      expect(tableContent).toContain('Documents');
      expect(tableContent).toContain('9,999');
    });

    describe('actions column', () => {
      const simulatedClickEvent = { persist: () => {} }; // Required for EUI action clicks. Can be removed if switching away from Enzyme to RTL

      const getActions = () => getTableBody().find('ExpandedItemActions');
      const getActionItems = () => getActions().first().dive().find('DefaultItemAction');

      describe('when the user can manage/delete engines', () => {
        const getManageAction = () => getActionItems().at(0).dive().find(EuiButtonIcon);
        const getDeleteAction = () => getActionItems().at(1).dive().find(EuiButtonIcon);

        beforeEach(() => {
          setMockValues({
            ...values,
            // AppLogic
            myRole: { canManageEngineCrawler: true },
          });
          wrapper = shallow(<DomainsTable />);
        });

        describe('manage action', () => {
          it('sends the user to the engine overview on click', () => {
            const { navigateToUrl } = mockKibanaValues;

            getManageAction().simulate('click', simulatedClickEvent);

            expect(navigateToUrl).toHaveBeenCalledWith(
              '/search_indices/index-name/domain_management/1234'
            );
          });
        });

        describe('delete action', () => {
          it('clicking the action and confirming deletes the domain', () => {
            getDeleteAction().simulate('click', simulatedClickEvent);

            expect(actions.showModal).toHaveBeenCalled();
          });
        });
      });
    });
  });
});
