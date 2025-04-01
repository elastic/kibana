/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { defaultGroupPanelRenderers } from './default_group_panel_renderers';
import { render } from '@testing-library/react';

describe('renderGroupPanel', () => {
  it('renders correctly when the field renderer exists', () => {
    let { getByTestId } = render(
      defaultGroupPanelRenderers(
        'kibana.alert.rule.name',
        {
          key: ['Rule name test', 'Some description'],
          doc_count: 10,
        },
        'This is a null group!'
      )!
    );

    expect(getByTestId('rule-name-group-renderer')).toBeInTheDocument();
    const result1 = render(
      defaultGroupPanelRenderers(
        'host.name',
        {
          key: 'Host',
          doc_count: 2,
        },
        'This is a null group!'
      )!
    );
    getByTestId = result1.getByTestId;

    expect(getByTestId('host-name-group-renderer')).toBeInTheDocument();

    const result2 = render(
      defaultGroupPanelRenderers(
        'user.name',
        {
          key: 'User test',
          doc_count: 1,
        },
        'This is a null group!'
      )!
    );
    getByTestId = result2.getByTestId;

    expect(getByTestId('host-name-group-renderer')).toBeInTheDocument();
    const result3 = render(
      defaultGroupPanelRenderers(
        'source.ip',
        {
          key: 'sourceIp',
          doc_count: 23,
        },
        'This is a null group!'
      )!
    );
    getByTestId = result3.getByTestId;

    expect(getByTestId('source-ip-group-renderer')).toBeInTheDocument();
  });

  it('returns undefined when the renderer does not exist', () => {
    const wrapper = defaultGroupPanelRenderers(
      'process.name',
      {
        key: 'process',
        doc_count: 10,
      },
      'This is a null group!'
    );

    expect(wrapper).toBeUndefined();
  });
});
