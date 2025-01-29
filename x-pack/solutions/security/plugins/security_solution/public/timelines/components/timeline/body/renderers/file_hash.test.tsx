/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';

import { TestProviders } from '../../../../../common/mock';
import { useMountAppended } from '../../../../../common/utils/use_mount_appended';

import { FileHash } from './file_hash';

jest.mock('../../../../../common/lib/kibana');

jest.mock('@elastic/eui', () => {
  const original = jest.requireActual('@elastic/eui');
  return {
    ...original,
    EuiScreenReaderOnly: () => <></>,
  };
});

describe('FileHash', () => {
  const mount = useMountAppended();

  const allProps = {
    contextId: 'test',
    eventId: '1',
    fileHashSha256: undefined,
  };

  test('displays the fileHashSha256 when provided', () => {
    const wrapper = mount(
      <TestProviders>
        <FileHash {...allProps} fileHashSha256="[fileHashSha256]" />
      </TestProviders>
    );
    expect(wrapper.text()).toEqual('[fileHashSha256]');
  });

  test('displays nothing when fileHashSha256 is null', () => {
    const wrapper = mount(
      <TestProviders>
        <FileHash {...allProps} fileHashSha256={null} />
      </TestProviders>
    );
    expect(wrapper.text()).toEqual('');
  });

  test('displays nothing when fileHashSha256 is undefined', () => {
    const wrapper = mount(
      <TestProviders>
        <FileHash {...allProps} />
      </TestProviders>
    );
    expect(wrapper.text()).toEqual('');
  });
});
