/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  EuiBadge,
  EuiInMemoryTable,
  EuiButton,
  EuiFlexGroup,
  EuiFlexItem,
  EuiSpacer,
  EuiText,
  EuiLink,
  EuiSearchBar,
} from '@elastic/eui';
import React, { useEffect, useState } from 'react';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';
import { useKibana } from '@kbn/kibana-react-plugin/public';
import { EuiBasicTableColumn } from '@elastic/eui/src/components/basic_table/basic_table';
import useDebounce from 'react-use/lib/useDebounce';
import { TableTitle } from '../../common/components/table_title';
import { ParamsText } from './params_text';
import { SyntheticsParams } from '../../../../../../common/runtime_types';
import { useParamsList } from '../hooks/use_params_list';
import { AddParamFlyout } from './add_param_flyout';
import { DeleteParam } from './delete_param';

export interface ListParamItem extends SyntheticsParams {
  id: string;
}

export const ParamsList = () => {
  const [pageIndex, setPageIndex] = useState(0);
  const [pageSize, setPageSize] = useState(10);

  const { items, isLoading } = useParamsList();

  const [isEditingItem, setIsEditingItem] = useState<ListParamItem | null>(null);

  const [selectedItems, setSelectedItems] = useState<ListParamItem[]>([]);

  const [isDeleteModalVisible, setIsDeleteModalVisible] = useState(false);
  const [deleteParam, setDeleteParam] = useState<ListParamItem[]>([]);

  const { application } = useKibana().services;

  const canSave = (application?.capabilities.uptime.save ?? false) as boolean;

  const columns: Array<EuiBasicTableColumn<ListParamItem>> = [
    {
      name: i18n.translate('xpack.synthetics.settingsRoute.params.key', {
        defaultMessage: 'Key',
      }),
      sortable: true,
      field: 'key',
    },
    {
      align: 'left' as const,
      width: '20%',
      name: i18n.translate('xpack.synthetics.settingsRoute.params.value', {
        defaultMessage: 'Value',
      }),
      render: (item: ListParamItem) => <ParamsText text={item.value ?? ''} />,
    },
    {
      name: i18n.translate('xpack.synthetics.settingsRoute.params.description', {
        defaultMessage: 'Description',
      }),
      field: 'description',
      sortable: true,
      render: (val: string) => <EuiText size="s">{val ?? '--'}</EuiText>,
    },
    {
      name: i18n.translate('xpack.synthetics.settingsRoute.params.tags', {
        defaultMessage: 'Tags',
      }),
      field: 'tags',
      sortable: true,
      render: (val: string[]) => {
        const tags = val ?? [];
        if (tags.length === 0) {
          return (
            <EuiText>
              {i18n.translate('xpack.synthetics.columns.TextLabel', { defaultMessage: '--' })}
            </EuiText>
          );
        }
        return (
          <EuiFlexGroup gutterSize="xs" wrap>
            {tags.map((tag) => (
              <EuiFlexItem grow={false} key={tag}>
                <EuiBadge>{tag}</EuiBadge>
              </EuiFlexItem>
            ))}
          </EuiFlexGroup>
        );
      },
    },
    {
      name: i18n.translate('xpack.synthetics.settingsRoute.params.namespaces', {
        defaultMessage: 'Namespaces',
      }),
      field: 'namespaces',
      sortable: true,
      render: (val: string[]) => {
        const namespaces = val ?? [];
        if (namespaces.length === 0) {
          return (
            <EuiText>
              {i18n.translate('xpack.synthetics.columns.TextLabel', { defaultMessage: '--' })}
            </EuiText>
          );
        }
        return (
          <EuiFlexGroup gutterSize="xs" wrap>
            {namespaces.map((namespace) => (
              <EuiFlexItem grow={false} key={namespace}>
                <EuiBadge>{namespace === '*' ? 'ALL' : namespace}</EuiBadge>
              </EuiFlexItem>
            ))}
          </EuiFlexGroup>
        );
      },
    },
    {
      name: i18n.translate('xpack.synthetics.settingsRoute.params.actions', {
        defaultMessage: 'Actions',
      }),
      actions: [
        {
          name: DELETE_PARAM,
          description: DELETE_PARAM,
          icon: 'trash',
          color: 'danger',
          type: 'icon',
          onClick: (item: ListParamItem) => {
            setDeleteParam([item]);
            setIsDeleteModalVisible(true);
          },
          'data-test-subj': 'action-delete',
          enabled: () => canSave,
        },
        {
          name: EDIT_PARAM,
          description: EDIT_PARAM,
          icon: 'pencil',
          type: 'icon',
          onClick: (item: ListParamItem) => {
            setIsEditingItem(item);
          },
          'data-test-subj': 'action-edit',
          enabled: () => canSave,
        },
      ],
    },
  ];

  const tagsList = items.reduce((acc, item) => {
    const tags = item.tags || [];
    return new Set([...acc, ...tags]);
  }, new Set<string>());

  const renderToolsLeft = () => {
    if (selectedItems.length === 0) {
      return;
    }

    return (
      <EuiButton
        data-test-subj="syntheticsRenderToolsLeftParamsButton"
        color="danger"
        onClick={() => {
          setDeleteParam(selectedItems);
          setIsDeleteModalVisible(true);
        }}
      >
        {i18n.translate('xpack.synthetics.settingsRoute.params.deleteCount', {
          defaultMessage: 'Delete {count} params',
          values: { count: selectedItems.length },
        })}
      </EuiButton>
    );
  };

  const renderToolRight = () => {
    return [
      <AddParamFlyout
        isEditingItem={isEditingItem}
        setIsEditingItem={setIsEditingItem}
        items={items}
        key="add-param-flyout"
      />,
    ];
  };

  const [query, setQuery] = useState('');
  const [debouncedValue, setDebouncedValue] = useState('');

  useDebounce(
    () => {
      setDebouncedValue(query);
    },
    200,
    [query]
  );

  const [filteredItems, setFilteredItems] = useState(items);

  useEffect(() => {
    if (!debouncedValue) {
      setFilteredItems(items);
    } else {
      const queriedItems = EuiSearchBar.Query.execute(debouncedValue, items, {
        defaultFields: ['key', 'description', 'tags'],
      });

      setFilteredItems(queriedItems);
    }
  }, [debouncedValue, items]);

  return (
    <div>
      <EuiText>
        <FormattedMessage
          id="xpack.synthetics.params.description"
          defaultMessage="Define variables and parameters that you can use in the configuration of browser and lightweight monitors, such as credentials or URLs. {learnMore}"
          values={{
            learnMore: (
              <EuiLink
                data-test-subj="syntheticsParamsListLink"
                href="https://www.elastic.co/guide/en/observability/current/synthetics-params-secrets.html"
                target="_blank"
              >
                {LEARN_MORE}
              </EuiLink>
            ),
          }}
        />
      </EuiText>
      <EuiSpacer size="m" />
      <EuiInMemoryTable<ListParamItem>
        itemId="id"
        loading={isLoading}
        tableCaption={PARAMS_TABLE}
        items={filteredItems}
        columns={columns}
        tableLayout="auto"
        pagination={true}
        sorting={{
          sort: { field: 'key', direction: 'asc' },
        }}
        childrenBetween={
          <TableTitle
            pageIndex={pageIndex}
            pageSize={pageSize}
            total={filteredItems.length}
            label={PARAMS_LABEL}
          />
        }
        onTableChange={({ page }) => {
          setPageIndex(page?.index ?? 0);
          setPageSize(page?.size ?? 10);
        }}
        selection={{
          selectable: () => canSave,
          onSelectionChange: (sItems) => {
            setSelectedItems(sItems);
          },
          initialSelected: selectedItems,
        }}
        search={{
          onChange: ({ query: queryText }) => setQuery(queryText?.text ?? ''),
          toolsLeft: renderToolsLeft(),
          toolsRight: renderToolRight(),
          box: {
            incremental: true,
          },
          filters: [
            {
              type: 'field_value_selection',
              field: 'tags',
              name: 'Tags',
              multiSelect: true,
              options: [...tagsList].map((tag) => ({
                value: tag,
                name: tag,
                view: tag,
              })),
            },
          ],
        }}
        message={isLoading ? LOADING_TEXT : undefined}
      />
      {isDeleteModalVisible && deleteParam && (
        <DeleteParam items={deleteParam} setIsDeleteModalVisible={setIsDeleteModalVisible} />
      )}
    </div>
  );
};

const PARAMS_TABLE = i18n.translate('xpack.synthetics.settingsRoute.params.tableCaption', {
  defaultMessage: 'Synthetics Global Parameters',
});

const PARAMS_LABEL = i18n.translate('xpack.synthetics.settingsRoute.params.label', {
  defaultMessage: 'Parameters',
});

const LEARN_MORE = i18n.translate('xpack.synthetics.settingsRoute.params.learnMore', {
  defaultMessage: 'Learn more.',
});

const EDIT_PARAM = i18n.translate('xpack.synthetics.settingsRoute.params.editLabel', {
  defaultMessage: 'Edit Parameter',
});

const LOADING_TEXT = i18n.translate('xpack.synthetics.settingsRoute.params.loading', {
  defaultMessage: 'Loading...',
});

const DELETE_PARAM = i18n.translate('xpack.synthetics.settingsRoute.params.addLabel', {
  defaultMessage: 'Delete Parameter',
});
