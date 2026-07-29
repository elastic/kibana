/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { act, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { buildDataTableRecord } from '@kbn/discover-utils';
import type { EsHitRecord } from '@kbn/discover-utils';
import {
  TABLE_TAB_CONTENT_TEST_ID,
  TABLE_TAB_SEARCH_INPUT_TEST_ID,
} from '../../../../flyout/document_details/right/tabs/test_ids';
import {
  TABLE_TAB_SETTING_BUTTON_TEST_ID,
  TABLE_TAB_SETTING_HIDE_ALERT_FIELDS_TEST_ID,
  TABLE_TAB_SETTING_HIDE_EMPTY_FIELDS_TEST_ID,
  TABLE_TAB_SETTING_HIGHLIGHTED_FIELDS_ONLY_TEST_ID,
} from '../../../../flyout/document_details/right/components/test_ids';
import { TableTab } from './table_tab';
import { noopCellActionRenderer } from '../../../shared/components/cell_actions';

const FIELD_NAME_ICON_TEST_ID = 'tableFieldNameIcon';

const mockGet = jest.fn();
const mockSet = jest.fn();

jest.mock('../../../../common/lib/kibana', () => {
  const original = jest.requireActual('../../../../common/lib/kibana');
  return {
    ...original,
    useKibana: () => ({
      services: {
        storage: { get: mockGet, set: mockSet },
      },
    }),
    useUiSetting: () => false,
  };
});

jest.mock('../../../../data_view_manager/hooks/use_browser_fields', () => ({
  useBrowserFields: () => ({}),
}));

jest.mock('../../../../detection_engine/rule_management/logic/use_rule_with_fallback', () => ({
  useRuleWithFallback: () => ({ rule: undefined }),
}));

jest.mock('@kbn/entity-store/public', () => ({
  FF_ENABLE_ENTITY_STORE_V2: 'securitySolution:enableEntityStoreV2',
  useEntityStoreEuidApi: () => null,
}));

jest.mock('../../../../flyout/entity_details/shared/hooks/use_entity_from_store', () => ({
  useEntityFromStore: () => ({
    entity: null,
    entityRecord: null,
    isLoading: false,
    error: null,
    refetch: jest.fn(),
  }),
}));

jest.mock('../../../../common/hooks/use_selector', () => ({
  useDeepEqualSelector: jest.fn(() => []),
}));

jest.mock('../hooks/use_highlighted_fields', () => ({
  useHighlightedFields: () => ({}),
}));

jest.mock('../utils/table_tab_columns', () => ({
  getTableTabColumns: () => {
    const ReactLib = jest.requireActual('react');
    return [
      {
        field: 'field',
        name: 'Field',
        render: (field: string) =>
          ReactLib.createElement(
            'span',
            null,
            ReactLib.createElement('span', { 'data-test-subj': FIELD_NAME_ICON_TEST_ID }),
            field
          ),
      },
      {
        field: 'values',
        name: 'Value',
        render: (values: string[] | string) =>
          ReactLib.createElement('span', null, Array.isArray(values) ? values.join(', ') : values),
      },
    ];
  },
}));

// An alert document so the "hide alert fields" setting is available. `fields` is populated (as it
// is on real hits) because the table derives its rows from the ES `fields` via
// `getTimelineFieldsDataFromHit`.
const hit = buildDataTableRecord({
  _id: 'test-id',
  _index: 'test-index',
  fields: {
    'event.kind': ['signal'],
    'kibana.alert.workflow_status': ['open'],
  },
  _source: {
    event: { kind: 'signal' },
    kibana: { alert: { workflow_status: 'open' } },
  },
} as EsHitRecord);

describe('<TableTab />', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should render table component', () => {
    const { getByTestId } = render(
      <TableTab hit={hit} renderCellActions={noopCellActionRenderer} />
    );

    expect(getByTestId(TABLE_TAB_CONTENT_TEST_ID)).toBeInTheDocument();
    expect(getByTestId(TABLE_TAB_SETTING_BUTTON_TEST_ID)).toBeInTheDocument();
  });

  it('should render the column headers and a field/value pair', () => {
    const { getAllByTestId, getByText } = render(
      <TableTab hit={hit} renderCellActions={noopCellActionRenderer} />
    );

    expect(getByText('Field')).toBeInTheDocument();
    expect(getByText('Value')).toBeInTheDocument();
    expect(getByText('kibana.alert.workflow_status')).toBeInTheDocument();
    expect(getByText('open')).toBeInTheDocument();
    expect(getAllByTestId(FIELD_NAME_ICON_TEST_ID).length).toBeGreaterThan(0);
  });

  it('should filter the table correctly', async () => {
    const { getByTestId, queryByText } = render(
      <TableTab hit={hit} renderCellActions={noopCellActionRenderer} />
    );

    await userEvent.type(getByTestId(TABLE_TAB_SEARCH_INPUT_TEST_ID), 'nomatch');
    expect(queryByText('kibana.alert.workflow_status')).not.toBeInTheDocument();
    expect(queryByText('open')).not.toBeInTheDocument();
  });

  it('should fetch the table state from local storage', async () => {
    mockGet.mockReturnValue({
      pinnedFields: [],
      showHighlightedFields: true,
      hideEmptyFields: false,
      hideAlertFields: true,
    });

    const { getByTestId } = render(
      <TableTab hit={hit} renderCellActions={noopCellActionRenderer} />
    );

    const settingsButton = getByTestId(TABLE_TAB_SETTING_BUTTON_TEST_ID).querySelector('button');
    expect(settingsButton).not.toBeNull();
    await act(async () => {
      await userEvent.click(settingsButton as HTMLButtonElement);
    });

    expect(screen.getByTestId(TABLE_TAB_SETTING_HIGHLIGHTED_FIELDS_ONLY_TEST_ID)).toBeChecked();
    expect(screen.getByTestId(TABLE_TAB_SETTING_HIDE_EMPTY_FIELDS_TEST_ID)).not.toBeChecked();
    expect(screen.getByTestId(TABLE_TAB_SETTING_HIDE_ALERT_FIELDS_TEST_ID)).toBeChecked();
  });
});
