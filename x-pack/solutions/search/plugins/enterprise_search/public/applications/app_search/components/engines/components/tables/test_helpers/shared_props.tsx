/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ShallowWrapper } from 'enzyme';

import { EuiBasicTable } from '@elastic/eui';

export const runSharedPropsTests = (wrapper: ShallowWrapper) => {
  it('passes the loading prop', () => {
    wrapper.setProps({ loading: true });
    expect(wrapper.find(EuiBasicTable).prop('loading')).toEqual(true);
  });

  it('passes the noItemsMessage prop', () => {
    wrapper.setProps({ noItemsMessage: 'No items.' });
    expect(wrapper.find(EuiBasicTable).prop('noItemsMessage')).toEqual('No items.');
  });

  describe('pagination', () => {
    it('passes the pagination prop', () => {
      const pagination = {
        pageIndex: 0,
        pageSize: 10,
        totalItemCount: 50,
      };
      wrapper.setProps({ pagination });
      expect(wrapper.find(EuiBasicTable).prop('pagination')).toEqual(pagination);
    });

    it('triggers onChange', () => {
      const onChange = jest.fn();
      wrapper.setProps({ onChange });

      wrapper.find(EuiBasicTable).simulate('change', { page: { index: 4 } });
      expect(onChange).toHaveBeenCalledWith({ page: { index: 4 } });
    });
  });
};
