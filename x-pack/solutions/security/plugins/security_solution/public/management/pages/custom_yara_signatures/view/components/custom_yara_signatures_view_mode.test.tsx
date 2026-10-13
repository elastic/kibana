/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { ExceptionsListItemGenerator } from '../../../../../../common/endpoint/data_generators/exceptions_list_item_generator';
import { CUSTOM_YARA_SIGNATURE_FIELD_TYPE } from '../../../../../../common/endpoint/service/artifacts/constants';
import { createAppRootMockRenderer } from '../../../../../common/mock/endpoint';
import { CustomYaraSignaturesViewMode } from './custom_yara_signatures_view_mode';

// Jest resolves @elastic/eui to test-env, whose EuiCodeBlock omits controls.
// Surface the props that choose those buttons: isCopyable is Copy, overflowHeight is Expand.
jest.mock('@elastic/eui', () => {
  const actual = jest.requireActual('@elastic/eui');
  return {
    ...actual,
    EuiCodeBlock: ({
      children,
      isCopyable,
      overflowHeight,
      'data-test-subj': dataTestSubj,
    }: {
      children?: React.ReactNode;
      isCopyable?: boolean;
      overflowHeight?: number | string;
      'data-test-subj'?: string;
    }) => (
      <div>
        <code data-test-subj={dataTestSubj} data-overflow-height={overflowHeight}>
          {children}
        </code>
        {isCopyable ? <button type="button" aria-label="Copy" /> : null}
        {overflowHeight !== undefined ? <button type="button" aria-label="Expand" /> : null}
      </div>
    ),
  };
});

describe('CustomYaraSignaturesViewMode', () => {
  const signature = 'rule test_rule { condition: true }';

  it('renders the signature in a code block', () => {
    const item = new ExceptionsListItemGenerator('seed').generate({
      entries: [
        {
          field: CUSTOM_YARA_SIGNATURE_FIELD_TYPE,
          operator: 'included',
          type: 'match',
          value: signature,
        },
      ],
    });
    const { getByTestId, getByLabelText } = createAppRootMockRenderer().render(
      <CustomYaraSignaturesViewMode item={item} />
    );

    expect(getByTestId('customYaraSignaturesViewMode')).toHaveTextContent(signature);
    expect(getByLabelText('Copy')).toBeInTheDocument();
    expect(getByLabelText('Expand')).toBeInTheDocument();
  });

  it('renders an empty code block when the artifact has no entries', () => {
    const item = new ExceptionsListItemGenerator('seed').generate({ entries: [] });
    const { getByTestId } = createAppRootMockRenderer().render(
      <CustomYaraSignaturesViewMode item={item} />
    );

    expect(getByTestId('customYaraSignaturesViewMode').textContent).toBe('');
  });
});
