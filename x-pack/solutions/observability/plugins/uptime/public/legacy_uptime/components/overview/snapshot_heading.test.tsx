/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { shallowWithIntl } from '@kbn/test-jest-helpers';
import React from 'react';
import { SnapshotHeading } from './snapshot/snapshot_heading';

describe('SnapshotHeading', () => {
  it('renders custom heading for no down monitors', () => {
    const wrapper = shallowWithIntl(<SnapshotHeading total={23} />);
    expect(wrapper).toMatchSnapshot();
  });

  it('renders standard heading for valid counts', () => {
    const wrapper = shallowWithIntl(<SnapshotHeading total={17} />);
    expect(wrapper).toMatchSnapshot();
  });

  it('renders custom heading for no monitors', () => {
    const wrapper = shallowWithIntl(<SnapshotHeading total={0} />);
    expect(wrapper).toMatchSnapshot();
  });
});
