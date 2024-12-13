/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { MonitorListPageSizeSelectComponent } from './monitor_list_page_size_select';
import { mountWithIntl } from '@kbn/test-jest-helpers';

describe('MonitorListPageSizeSelect', () => {
  it('updates the state when selection changes', () => {
    const setSize = jest.fn();
    const setUrlParams = jest.fn();
    const wrapper = mountWithIntl(
      <MonitorListPageSizeSelectComponent size={10} setSize={setSize} setUrlParams={setUrlParams} />
    );
    wrapper
      .find('[data-test-subj="xpack.uptime.monitorList.pageSizeSelect.popoverOpen"]')
      .first()
      .simulate('click');
    wrapper
      .find('[data-test-subj="xpack.uptime.monitorList.pageSizeSelect.sizeSelectItem25"]')
      .first()
      .simulate('click');
    expect(setSize).toHaveBeenCalledTimes(1);
    expect(setSize.mock.calls).toMatchInlineSnapshot(`
      Array [
        Array [
          25,
        ],
      ]
    `);
    expect(setUrlParams).toHaveBeenCalledTimes(1);
    expect(setUrlParams.mock.calls).toMatchInlineSnapshot(`
      Array [
        Array [
          Object {
            "pagination": undefined,
          },
        ],
      ]
    `);
  });
});
