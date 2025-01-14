/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render } from '@testing-library/react';
import * as i18n from '../../translations';
import { OS_LABELS } from '../conditions.config';
import { OsCondition } from '.';

describe('OsCondition', () => {
  it('should render one OS_LABELS', () => {
    const wrapper = render(<OsCondition os={['macos']} dataTestSubj="OsConditionMac" />);
    expect(wrapper.getByTestId('osLabel')).toHaveTextContent(i18n.CONDITION_OS);
    expect(wrapper.getByTestId('osValue')).toHaveTextContent(
      `${i18n.CONDITION_OPERATOR_TYPE_MATCH} ${OS_LABELS.macos}`
    );
    expect(wrapper.container).toMatchSnapshot();
  });
  it('should render two OS_LABELS', () => {
    const wrapper = render(<OsCondition os={['macos', 'windows']} dataTestSubj="OsConditionMac" />);
    expect(wrapper.getByTestId('osLabel')).toHaveTextContent(i18n.CONDITION_OS);
    expect(wrapper.getByTestId('osValue')).toHaveTextContent(
      `${i18n.CONDITION_OPERATOR_TYPE_MATCH} ${OS_LABELS.macos}, ${OS_LABELS.windows}`
    );
    expect(wrapper.container).toMatchSnapshot();
  });
  it('should return empty body', () => {
    const wrapper = render(<OsCondition os={[]} dataTestSubj="OsConditionMac" />);
    expect(wrapper.container).toMatchSnapshot();
  });
  it('should return any os sent', () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const wrapper = render(<OsCondition os={['MacPro' as any]} dataTestSubj="OsConditionMac" />);
    expect(wrapper.getByTestId('osLabel')).toHaveTextContent(i18n.CONDITION_OS);
    expect(wrapper.getByTestId('osValue')).toHaveTextContent(
      `${i18n.CONDITION_OPERATOR_TYPE_MATCH} MacPro`
    );
    expect(wrapper.container).toMatchSnapshot();
  });
});
