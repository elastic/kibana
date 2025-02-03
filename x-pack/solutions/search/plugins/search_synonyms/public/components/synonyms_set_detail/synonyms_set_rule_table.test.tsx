/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';

import { render, screen } from '@testing-library/react';
import { SynonymsSetRuleTable } from './synonyms_set_rule_table';

jest.mock('../../hooks/use_fetch_synonyms_set', () => ({
  useFetchSynonymsSet: () => ({
    data: {
      data: [
        {
          id: 'rule_id_1',
          synonyms: 'synonym1',
        },
        {
          id: 'rule_id_2',
          synonyms: 'synonym2',
        },
        {
          id: 'rule_id_3',
          synonyms: 'explicit-from => explicit-to',
        },
      ],
      id: 'my_synonyms_set',
      _meta: {
        pageIndex: 0,
        pageSize: 10,
        totalItemCount: 2,
      },
    },
    isLoading: false,
    isError: false,
  }),
}));

jest.mock('../../hooks/use_fetch_generated_rule_id', () => ({
  useFetchGeneratedRuleId: () => ({
    mutate: jest.fn(),
  }),
}));

jest.mock('../../hooks/use_fetch_synonym_rule', () => ({
  useFetchSynonymRule: () => ({
    data: {
      id: 'rule_id_3',
      synonyms: 'explicit-from => explicit-to',
    },
    isLoading: false,
    isError: false,
  }),
}));

jest.mock('../../hooks/use_put_synonyms_rule', () => ({
  usePutSynonymsRule: () => ({
    mutate: jest.fn(),
  }),
}));

describe('SynonymSetDetail table', () => {
  it('should render the list with synonym rules', () => {
    render(<SynonymsSetRuleTable synonymsSetId="synonymSetId" />);
    const synonymSetTable = screen.getByTestId('synonyms-set-table');
    expect(synonymSetTable).toBeInTheDocument();

    const synonymsSetExplicitFrom = screen.getByTestId('synonyms-set-item-explicit-from');
    const synonymsSetExplicitTo = screen.getByTestId('synonyms-set-item-explicit-to');
    expect(synonymsSetExplicitFrom.textContent?.trim()).toBe('explicit-from');
    expect(synonymsSetExplicitTo.textContent?.trim()).toBe('explicit-to');

    const synonymsSetEquivalent = screen.getAllByTestId('synonyms-set-item-equivalent');
    expect(synonymsSetEquivalent).toHaveLength(2);
    expect(synonymsSetEquivalent[0].textContent).toBe('synonym1');
    expect(synonymsSetEquivalent[1].textContent).toBe('synonym2');

    expect(screen.getByTestId('tablePaginationPopoverButton')).toBeInTheDocument();
    expect(screen.getByTestId('pagination-button-0')).toBeInTheDocument();
  });
});
