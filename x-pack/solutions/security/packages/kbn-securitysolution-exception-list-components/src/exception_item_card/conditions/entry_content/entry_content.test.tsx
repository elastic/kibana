/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render } from '@testing-library/react';
import type { EntryMatch } from '@kbn/securitysolution-io-ts-list-types';
import { includedListTypeEntry } from '../../../mocks/entry.mock';
import * as i18n from '../../translations';
import { EntryContent } from '.';
import { MockedShowValueListModal } from '../../../mocks/value_list_modal.mock';

describe('EntryContent', () => {
  it('should render a single value without AND when index is 0', () => {
    const wrapper = render(
      <EntryContent
        entry={includedListTypeEntry}
        index={0}
        dataTestSubj="EntryContent"
        showValueListModal={MockedShowValueListModal}
      />
    );
    expect(wrapper.getByTestId('EntryContentSingleEntry')).toBeInTheDocument();
    expect(wrapper.getByTestId('entryValueExpression')).toHaveTextContent('list_id');
  });
  it('should render a single value with AND when index is 1', () => {
    const wrapper = render(
      <EntryContent
        entry={includedListTypeEntry}
        index={1}
        dataTestSubj="EntryContent"
        showValueListModal={MockedShowValueListModal}
      />
    );
    expect(wrapper.getByTestId('EntryContentSingleEntry')).toBeInTheDocument();
    expect(wrapper.getByTestId('entryValueExpression')).toHaveTextContent('list_id');
    expect(wrapper.getByText(i18n.CONDITION_AND)).toBeInTheDocument();
  });
  it('should render a nested value', () => {
    const wrapper = render(
      <EntryContent
        entry={includedListTypeEntry}
        index={0}
        isNestedEntry
        dataTestSubj="EntryContent"
        showValueListModal={MockedShowValueListModal}
      />
    );
    expect(wrapper.getByTestId('EntryContentNestedEntry')).toBeInTheDocument();
    expect(wrapper.getByTestId('nstedEntryIcon')).toBeInTheDocument();
    expect(wrapper.getByTestId('entryValueExpression')).toHaveTextContent('list_id');
    expect(wrapper.container).toMatchSnapshot();
  });

  it('should show the column type after the value of an entry on a computed column', () => {
    const entry: EntryMatch = {
      field: 'Esql.failed_count',
      type: 'match',
      operator: 'included',
      value: '25',
      value_type: 'long',
    };
    const wrapper = render(
      <EntryContent
        entry={entry}
        index={0}
        dataTestSubj="EntryContent"
        showValueListModal={MockedShowValueListModal}
      />
    );
    expect(wrapper.getByTestId('entryValueExpression')).toHaveTextContent('25');
    expect(wrapper.getByTestId('entryColumnType')).toHaveTextContent('(long)');
  });

  it('should not show a column type for an entry on a source field', () => {
    const wrapper = render(
      <EntryContent
        entry={includedListTypeEntry}
        index={0}
        dataTestSubj="EntryContent"
        showValueListModal={MockedShowValueListModal}
      />
    );
    expect(wrapper.queryByTestId('entryColumnType')).not.toBeInTheDocument();
  });
});
