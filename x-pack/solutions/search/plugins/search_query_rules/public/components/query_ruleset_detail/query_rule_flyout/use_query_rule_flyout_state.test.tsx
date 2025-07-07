/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';

import { act, render, renderHook, waitFor } from '@testing-library/react';
import { FormProvider, useForm } from 'react-hook-form';
import { useFetchIndexNames } from '../../../hooks/use_fetch_index_names';
import {
  UseQueryRuleFlyoutStateProps,
  useQueryRuleFlyoutState,
} from './use_query_rule_flyout_state';
import { QueryRuleEditorForm, SearchQueryRulesQueryRule } from '../../../../common/types';
import { DropResult, ResponderProvided } from '@elastic/eui';

jest.mock('../../../hooks/use_fetch_index_names', () => ({
  useFetchIndexNames: jest.fn().mockReturnValue({
    data: [],
    isLoading: false,
    isError: false,
  }),
}));

const mockUseFetchIndexNames = useFetchIndexNames as jest.Mock;
let mockFlyoutState: ReturnType<typeof useQueryRuleFlyoutState>;

const MockComponent = ({ initialState }: { initialState?: UseQueryRuleFlyoutStateProps }) => {
  mockFlyoutState = useQueryRuleFlyoutState(
    initialState || {
      rulesetId: '',
      createMode: false,
      ruleId: '',
      rules: [],
      onSave: jest.fn(),
    }
  );
  return <div>test</div>;
};
const MockFormProvider = ({
  children,
  initialFormValues = {
    defaultValues: {
      mode: 'edit',
      rulesetId: '',
      ruleId: '',
      criteria: [],
      type: 'pinned',
      isAlways: false,
      actions: { docs: [], ids: [] },
    },
  },
}: {
  children: React.ReactNode;
  initialFormValues?: Record<string, any>;
}) => {
  const methods = useForm<QueryRuleEditorForm>(initialFormValues);
  return <FormProvider {...methods}>{children}</FormProvider>;
};

describe('useQueryRuleFlyoutState hook', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUseFetchIndexNames.mockReturnValue({
      data: [],
      isLoading: false,
      isError: false,
    });
  });
  it('should return defaults in edit mode', () => {
    const { result } = renderHook(
      () =>
        useQueryRuleFlyoutState({
          rulesetId: '',
          createMode: false,
          ruleId: '',
          rules: [],
          onSave: jest.fn(),
        }),
      {
        wrapper: MockFormProvider,
      }
    );

    const {
      actionFields,
      actionIdsFields,
      criteria,
      criteriaCount,
      documentCount,
      indexNames,
      isAlways,
      isDocRule,
      isFlyoutDirty,
      isIdRule,
      pinType,
      shouldShowCriteriaCallout,
      shouldShowMetadataEditor,
    } = result.current;

    // expect all the properties defined above to have correct initial values
    expect(actionFields).toEqual([]);
    expect(actionIdsFields).toEqual([]);
    expect(criteria).toEqual([]);
    expect(criteriaCount).toBe(0);
    expect(documentCount).toBe(0);
    expect(indexNames).toEqual([]);
    expect(isAlways).toBe(false);
    expect(isDocRule).toBe(true);
    expect(isFlyoutDirty).toBe(false);
    expect(isIdRule).toBe(false);
    expect(pinType).toBe('pinned');
    expect(shouldShowCriteriaCallout).toBe(true);
    // This is not supposed to be happening at all.
    // TODO: Better default
    expect(shouldShowMetadataEditor).toBe(false);
  });

  describe('edit mode', () => {
    it('should setup a rule with doc mode', async () => {
      const rules: SearchQueryRulesQueryRule[] = [
        {
          rule_id: 'rule-1',
          type: 'pinned',
          actions: {
            docs: [
              {
                _index: 'index-1',
                _id: 'doc-1',
              },
            ],
          },
          criteria: [
            {
              metadata: 'field1',
              type: 'exact',
              values: ['value1'],
            },
          ],
        },
        {
          rule_id: 'rule-2',
          type: 'exclude',
          actions: {
            docs: [
              {
                _index: 'index-2',
                _id: 'doc-2',
              },
            ],
          },
          criteria: [
            {
              metadata: 'field2',
              type: 'exact',
              values: ['value2'],
            },
          ],
        },
      ];

      mockUseFetchIndexNames.mockReturnValue({
        data: ['index-1', 'index-2'],
        isLoading: false,
        isError: false,
      });
      render(
        <MockFormProvider>
          <MockComponent
            initialState={{
              createMode: false,
              rulesetId: 'ruleset-1',
              ruleId: 'rule-2',
              rules,
              onSave: jest.fn(),
            }}
          />
        </MockFormProvider>
      );

      const {
        actionFields,
        actionIdsFields,
        criteria,
        criteriaCount,
        documentCount,
        indexNames,
        isAlways,
        isDocRule,
        isIdRule,
        pinType,
      } = mockFlyoutState;
      await waitFor(() =>
        expect(actionFields).toEqual([
          expect.objectContaining({
            _index: 'index-2',
            _id: 'doc-2',
          }),
        ])
      );
      expect(actionIdsFields).not.toBeDefined();
      expect(criteria).toEqual([
        expect.objectContaining({
          metadata: 'field2',
          type: 'exact',
          values: ['value2'],
        }),
      ]);
      expect(criteriaCount).toBe(1);
      expect(documentCount).toBe(1);
      expect(indexNames).toEqual(['index-1', 'index-2']);
      expect(isAlways).toBe(false);
      expect(isDocRule).toBe(true);
      expect(isIdRule).toBe(false);
      expect(pinType).toBe('exclude');
    });
    it('should setup a rule with id mode', async () => {
      const rules: SearchQueryRulesQueryRule[] = [
        {
          rule_id: 'rule-1',
          type: 'pinned',
          actions: {
            ids: ['id-1', 'id-2'],
          },
          criteria: [
            {
              metadata: 'field1',
              type: 'exact',
              values: ['value1'],
            },
          ],
        },
      ];

      mockUseFetchIndexNames.mockReturnValue({
        data: ['index-3', 'index-4'],
        isLoading: false,
        isError: false,
      });
      render(
        <MockFormProvider>
          <MockComponent
            initialState={{
              createMode: false,
              rulesetId: 'ruleset-1',
              ruleId: 'rule-1',
              rules,
              onSave: jest.fn(),
            }}
          />
        </MockFormProvider>
      );

      const {
        actionFields,
        actionIdsFields,
        criteria,
        criteriaCount,
        documentCount,
        indexNames,
        isAlways,
        isDocRule,
        isIdRule,
        pinType,
      } = mockFlyoutState;
      await waitFor(() => expect(actionIdsFields).toEqual(['id-1', 'id-2']));
      expect(actionFields).toEqual([]);
      expect(criteria).toEqual([
        expect.objectContaining({
          metadata: 'field1',
          type: 'exact',
          values: ['value1'],
        }),
      ]);
      expect(criteriaCount).toBe(1);
      expect(documentCount).toBe(2);
      expect(indexNames).toEqual(['index-3', 'index-4']);
      expect(isAlways).toBe(false);
      expect(isDocRule).toBe(false);
      expect(isIdRule).toBe(true);
      expect(pinType).toBe('pinned');
    });

    it('should set isAlways to true when criteria is always', async () => {
      const rules: SearchQueryRulesQueryRule[] = [
        {
          rule_id: 'rule-1',
          type: 'pinned',
          actions: {
            docs: [
              {
                _index: 'index-1',
                _id: 'doc-1',
              },
            ],
          },
          criteria: [
            {
              type: 'always',
            },
          ],
        },
      ];

      mockUseFetchIndexNames.mockReturnValue({
        data: ['index-1'],
        isLoading: false,
        isError: false,
      });
      render(
        <MockFormProvider>
          <MockComponent
            initialState={{
              createMode: false,
              rulesetId: 'ruleset-1',
              ruleId: 'rule-1',
              rules,
              onSave: jest.fn(),
            }}
          />
        </MockFormProvider>
      );

      const { isAlways, criteria, criteriaCount } = mockFlyoutState;
      expect(isAlways).toBe(true);

      expect(criteria).toEqual([
        expect.objectContaining({
          type: 'always',
        }),
      ]);
      expect(criteriaCount).toBe(1);
    });

    it('should handle add criteria correctly', async () => {
      const rules: SearchQueryRulesQueryRule[] = [
        {
          rule_id: 'rule-1',
          type: 'pinned',
          actions: {
            docs: [],
          },
          criteria: [],
        },
      ];

      render(
        <MockFormProvider>
          <MockComponent
            initialState={{
              createMode: false,
              rulesetId: 'ruleset-1',
              ruleId: 'rule-1',
              rules,
              onSave: jest.fn(),
            }}
          />
        </MockFormProvider>
      );

      expect(mockFlyoutState.isFlyoutDirty).toBe(false);
      act(() => mockFlyoutState.handleAddCriteria());

      expect(mockFlyoutState.isFlyoutDirty).toBe(true);

      await waitFor(() => {
        expect(mockFlyoutState.isFlyoutDirty).toBe(true);
      });
      await waitFor(() => {
        expect(mockFlyoutState.criteriaCount).toBe(1);
      });
      await waitFor(() =>
        expect(mockFlyoutState.criteria[0]).toEqual(
          expect.objectContaining({ type: 'exact', metadata: '', values: [] })
        )
      );
    });

    it('should handle drag end event correctly for doc mode', async () => {
      const rules: SearchQueryRulesQueryRule[] = [
        {
          rule_id: 'rule-1',
          type: 'pinned',
          actions: {
            docs: [
              {
                _index: 'index-1',
                _id: 'doc-1',
              },
              {
                _index: 'index-2',
                _id: 'doc-2',
              },
            ],
          },
          criteria: [],
        },
      ];

      render(
        <MockFormProvider>
          <MockComponent
            initialState={{
              createMode: false,
              rulesetId: 'ruleset-1',
              ruleId: 'rule-1',
              rules,
              onSave: jest.fn(),
            }}
          />
        </MockFormProvider>
      );

      expect(mockFlyoutState.actionFields).toEqual([
        expect.objectContaining({ _index: 'index-1', _id: 'doc-1' }),
        expect.objectContaining({ _index: 'index-2', _id: 'doc-2' }),
      ]);
      act(() => {
        mockFlyoutState.dragEndHandle(
          {
            source: { index: 0, droppableId: 'actions' },
            destination: { index: 1, droppableId: 'actions' },
          } as DropResult<string>,
          {} as ResponderProvided
        );
      });

      await waitFor(() =>
        expect(mockFlyoutState.actionFields).toEqual([
          expect.objectContaining({ _index: 'index-2', _id: 'doc-2' }),
          expect.objectContaining({ _index: 'index-1', _id: 'doc-1' }),
        ])
      );

      act(() => {
        mockFlyoutState.dragEndHandle(
          {
            source: { index: 0, droppableId: 'actions' },
            destination: { index: 1, droppableId: 'actions' },
          } as DropResult<string>,
          {} as ResponderProvided
        );
      });
      await waitFor(() => expect(mockFlyoutState.isFlyoutDirty).toBe(true));
      await waitFor(() => {
        expect(mockFlyoutState.actionFields).toEqual([
          expect.objectContaining({ _index: 'index-1', _id: 'doc-1' }),
          expect.objectContaining({ _index: 'index-2', _id: 'doc-2' }),
        ]);
      });
    });
    it('should handle drag end event correctly for id mode', async () => {
      const rules: SearchQueryRulesQueryRule[] = [
        {
          rule_id: 'rule-1',
          type: 'pinned',
          actions: {
            ids: ['id-1', 'id-2'],
          },
          criteria: [],
        },
      ];

      render(
        <MockFormProvider>
          <MockComponent
            initialState={{
              createMode: false,
              rulesetId: 'ruleset-1',
              ruleId: 'rule-1',
              rules,
              onSave: jest.fn(),
            }}
          />
        </MockFormProvider>
      );

      expect(mockFlyoutState.isIdRule).toBe(true);
      expect(mockFlyoutState.actionIdsFields).toEqual(['id-1', 'id-2']);
      act(() => {
        mockFlyoutState.dragEndHandle(
          {
            source: { index: 0, droppableId: 'actions' },
            destination: { index: 1, droppableId: 'actions' },
          } as DropResult<string>,
          {} as ResponderProvided
        );
      });

      await waitFor(() => expect(mockFlyoutState.actionIdsFields).toEqual(['id-2', 'id-1']));

      act(() => {
        mockFlyoutState.dragEndHandle(
          {
            source: { index: 1, droppableId: 'actions' },
            destination: { index: 0, droppableId: 'actions' },
          } as DropResult<string>,

          {} as ResponderProvided
        );
      });

      await waitFor(() => {
        expect(mockFlyoutState.actionIdsFields).toEqual(['id-1', 'id-2']);
      });
    });
    it('handles onIndexSelectorChange correctly', async () => {
      const rules: SearchQueryRulesQueryRule[] = [
        {
          rule_id: 'rule-1',
          type: 'pinned',
          actions: {
            docs: [
              {
                _index: 'index-1',
                _id: 'doc-1',
              },
            ],
          },
          criteria: [],
        },
      ];

      render(
        <MockFormProvider>
          <MockComponent
            initialState={{
              createMode: false,
              rulesetId: 'ruleset-1',
              ruleId: 'rule-1',
              rules,
              onSave: jest.fn(),
            }}
          />
        </MockFormProvider>
      );

      expect(mockFlyoutState.isDocRule).toBe(true);
      act(() => mockFlyoutState.onIndexSelectorChange(0, 'index-2'));
      await waitFor(() => {
        expect(mockFlyoutState.actionFields).toEqual([
          expect.objectContaining({ _index: 'index-2', _id: 'doc-1' }),
        ]);
      });
    });

    it('should handle onIdSelectorChange correctly in id mode', async () => {
      const rules: SearchQueryRulesQueryRule[] = [
        {
          rule_id: 'rule-1',
          type: 'pinned',
          actions: {
            ids: ['id-1'],
          },
          criteria: [],
        },
      ];

      render(
        <MockFormProvider>
          <MockComponent
            initialState={{
              createMode: false,
              rulesetId: 'ruleset-1',
              ruleId: 'rule-1',
              rules,
              onSave: jest.fn(),
            }}
          />
        </MockFormProvider>
      );

      const { onIdSelectorChange, isIdRule } = mockFlyoutState;
      expect(isIdRule).toBe(true);

      act(() => onIdSelectorChange(0, 'id-2'));
      await waitFor(() => {
        expect(mockFlyoutState.actionIdsFields).toEqual(['id-2']);
      });
    });
  });
  describe('create mode', () => {
    it('should setup a new rule with default values', () => {
      render(
        <MockFormProvider>
          <MockComponent
            initialState={{
              createMode: true,
              rulesetId: 'ruleset-1',
              ruleId: 'rule-1',
              rules: [],
              onSave: jest.fn(),
            }}
          />
        </MockFormProvider>
      );

      const {
        actionFields,
        actionIdsFields,
        criteria,
        criteriaCount,
        isAlways,
        isDocRule,
        isIdRule,
        pinType,
      } = mockFlyoutState;

      expect(actionFields).toEqual([expect.objectContaining({ _index: '', _id: '' })]);
      expect(actionIdsFields).toEqual([]);
      expect(criteria).toEqual([
        expect.objectContaining({ type: 'exact', metadata: '', values: [] }),
      ]);
      expect(criteriaCount).toBe(1);
      expect(isAlways).toBe(false);
      expect(isDocRule).toBe(true);
      expect(pinType).toBe('pinned');
      expect(isIdRule).toBe(false);
    });

    it('should handle onIdSelectorChange correctly', async () => {
      render(
        <MockFormProvider>
          <MockComponent
            initialState={{
              createMode: true,
              rulesetId: 'ruleset-1',
              ruleId: 'rule-1',
              rules: [],
              onSave: jest.fn(),
            }}
          />
        </MockFormProvider>
      );

      const { onIdSelectorChange, isIdRule, isDocRule } = mockFlyoutState;
      expect(isIdRule).toBe(false);
      expect(isDocRule).toBe(true);

      act(() => onIdSelectorChange(0, 'id-1'));
      await waitFor(() => {
        expect(mockFlyoutState.actionFields).toEqual([
          expect.objectContaining({ _index: '', _id: 'id-1' }),
        ]);
      });
    });
  });
});
