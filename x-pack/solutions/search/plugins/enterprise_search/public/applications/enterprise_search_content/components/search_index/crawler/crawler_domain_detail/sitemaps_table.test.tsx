/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { mockFlashMessageHelpers, setMockActions } from '../../../../../__mocks__/kea_logic';

import React from 'react';

import { shallow } from 'enzyme';

import { EuiEmptyPrompt, EuiFieldText } from '@elastic/eui';
import { mountWithIntl } from '@kbn/test-jest-helpers';

import { GenericEndpointInlineEditableTable } from '../../../../../shared/tables/generic_endpoint_inline_editable_table';

import { CrawlerDomain } from '../../../../api/crawler/types';

import { SitemapsTable } from './sitemaps_table';

describe('SitemapsTable', () => {
  const { clearFlashMessages, flashSuccessToast } = mockFlashMessageHelpers;
  const indexName = 'index-name';
  const sitemaps = [
    { id: '1', url: 'http://www.example.com/sitemap.xml' },
    { id: '2', url: 'http://www.example.com/whatever/sitemaps.xml' },
  ];
  const domain: CrawlerDomain = {
    auth: null,
    createdOn: '2018-01-01T00:00:00.000Z',
    documentCount: 10,
    id: '6113e1407a2f2e6f42489794',
    url: 'https://www.elastic.co',
    crawlRules: [],
    entryPoints: [],
    extractionRules: [],
    sitemaps,
    deduplicationEnabled: true,
    deduplicationFields: ['title'],
    availableDeduplicationFields: ['title', 'description'],
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders', () => {
    const wrapper = shallow(
      <SitemapsTable domain={domain} indexName={indexName} items={domain.sitemaps} />
    );

    expect(wrapper.find(GenericEndpointInlineEditableTable).exists()).toBe(true);
  });

  describe('the first and only column in the table', () => {
    it('shows the url of a sitemap', () => {
      const sitemap = { id: '1', url: 'http://www.example.com/sitemap.xml' };

      const wrapper = shallow(
        <SitemapsTable domain={domain} indexName={indexName} items={domain.sitemaps} />
      );

      const columns = wrapper.find(GenericEndpointInlineEditableTable).prop('columns');
      const column = shallow(<div>{columns[0].render(sitemap)}</div>);
      expect(column.html()).toContain('http://www.example.com/sitemap.xml');
    });

    it('can show the url of a sitemap as editable', () => {
      const sitemap = { id: '1', url: 'http://www.example.com/sitemap.xml' };
      const onChange = jest.fn();

      const wrapper = shallow(
        <SitemapsTable domain={domain} indexName={indexName} items={domain.sitemaps} />
      );

      const columns = wrapper.find(GenericEndpointInlineEditableTable).prop('columns');
      const column = shallow(
        <div>
          {columns[0].editingRender(sitemap, onChange, { isInvalid: false, isLoading: false })}
        </div>
      );

      const textField = column.find(EuiFieldText);
      expect(textField.props()).toEqual(
        expect.objectContaining({
          value: 'http://www.example.com/sitemap.xml',
          disabled: false, // It would be disabled if isLoading is true
          isInvalid: false,
        })
      );

      textField.simulate('change', { target: { value: '/foo' } });
      expect(onChange).toHaveBeenCalledWith('/foo');
    });
  });

  describe('routes', () => {
    it('can calculate an update and delete route correctly', () => {
      const wrapper = shallow(
        <SitemapsTable domain={domain} indexName={indexName} items={domain.sitemaps} />
      );

      const table = wrapper.find(GenericEndpointInlineEditableTable);

      const sitemap = { id: '1', url: '/whatever' };
      expect(table.prop('deleteRoute')(sitemap)).toEqual(
        '/internal/enterprise_search/indices/index-name/crawler/domains/6113e1407a2f2e6f42489794/sitemaps/1'
      );
      expect(table.prop('updateRoute')(sitemap)).toEqual(
        '/internal/enterprise_search/indices/index-name/crawler/domains/6113e1407a2f2e6f42489794/sitemaps/1'
      );
    });
  });

  it('shows a no items message whem there are no sitemaps to show', () => {
    const wrapper = shallow(
      <SitemapsTable domain={domain} indexName={indexName} items={domain.sitemaps} />
    );

    const editNewItems = jest.fn();
    const table = wrapper.find(GenericEndpointInlineEditableTable);
    const message = mountWithIntl(<div>{table.prop('noItemsMessage')!(editNewItems)}</div>);
    expect(message.find(EuiEmptyPrompt).exists()).toBe(true);
  });

  describe('when a sitemap is added', () => {
    it('should update the sitemaps for the current domain, and clear flash messages', () => {
      const updateSitemaps = jest.fn();
      setMockActions({
        updateSitemaps,
      });
      const wrapper = shallow(
        <SitemapsTable domain={domain} indexName={indexName} items={domain.sitemaps} />
      );
      const table = wrapper.find(GenericEndpointInlineEditableTable);

      const sitemapThatWasAdded = { id: '2', value: 'bar' };
      const updatedSitemaps = [
        { id: '1', value: 'foo' },
        { id: '2', value: 'bar' },
      ];
      table.prop('onAdd')(sitemapThatWasAdded, updatedSitemaps);
      expect(updateSitemaps).toHaveBeenCalledWith(updatedSitemaps);
      expect(clearFlashMessages).toHaveBeenCalled();
    });
  });

  describe('when a sitemap is updated', () => {
    it('should update the sitemaps for the current domain, and clear flash messages', () => {
      const updateSitemaps = jest.fn();
      setMockActions({
        updateSitemaps,
      });
      const wrapper = shallow(
        <SitemapsTable domain={domain} indexName={indexName} items={domain.sitemaps} />
      );
      const table = wrapper.find(GenericEndpointInlineEditableTable);

      const sitemapThatWasUpdated = { id: '2', value: 'bar' };
      const updatedSitemaps = [
        { id: '1', value: 'foo' },
        { id: '2', value: 'baz' },
      ];
      table.prop('onUpdate')(sitemapThatWasUpdated, updatedSitemaps);
      expect(updateSitemaps).toHaveBeenCalledWith(updatedSitemaps);
      expect(clearFlashMessages).toHaveBeenCalled();
    });
  });

  describe('when a sitemap is deleted', () => {
    it('should update the sitemaps for the current domain, clear flash messages, and show a success', () => {
      const updateSitemaps = jest.fn();
      setMockActions({
        updateSitemaps,
      });
      const wrapper = shallow(
        <SitemapsTable domain={domain} indexName={indexName} items={domain.sitemaps} />
      );
      const table = wrapper.find(GenericEndpointInlineEditableTable);

      const sitemapThatWasDeleted = { id: '2', value: 'bar' };
      const updatedSitemaps = [{ id: '1', value: 'foo' }];
      table.prop('onDelete')(sitemapThatWasDeleted, updatedSitemaps);
      expect(updateSitemaps).toHaveBeenCalledWith(updatedSitemaps);
      expect(clearFlashMessages).toHaveBeenCalled();
      expect(flashSuccessToast).toHaveBeenCalled();
    });
  });
});
