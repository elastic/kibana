/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';

import { TestProviders } from '../../../../../../common/mock';
import { PreferenceFormattedBytes } from '../../../../../../common/components/formatted_bytes';
import { useMountAppended } from '../../../../../../common/utils/use_mount_appended';

import { Bytes } from '.';

jest.mock('../../../../../../common/lib/kibana');

describe('Bytes', () => {
  const mount = useMountAppended();

  test('it renders the expected formatted bytes', () => {
    const wrapper = mount(
      <TestProviders>
        <Bytes value={`1234567`} />
      </TestProviders>
    );
    expect(wrapper.find(PreferenceFormattedBytes).first().text()).toEqual('1.2MB');
  });
});
