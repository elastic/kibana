/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  EuiBasicTable,
  EuiBasicTableColumn,
  EuiButtonIcon,
  EuiContextMenuItem,
  EuiContextMenuPanel,
  EuiIcon,
  EuiPopover,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import React from 'react';

// TODO: Move this to common
interface SynonymSet {
  name: string;
  ruleCount: number;
}
export const SynonymSets = () => {
  const [isPopoverOpen, setIsPopoverOpen] = React.useState(false);
  const pagination = {
    initialPageSize: 25,
    pageSizeOptions: [10, 25, 50],
    totalItemCount: 2,
    pageIndex: 0,
    pageSize: 1,
  };
  const items = [
    {
      name: 'Synonyms Set 1',
      ruleCount: 2,
    },
    {
      name: 'Synonyms Set 2',
      ruleCount: 3,
    },
  ];
  const columns: Array<EuiBasicTableColumn<SynonymSet>> = [
    {
      field: 'name',
      name: i18n.translate('xpack.searchSynonyms.synonymsSetTable.nameColumn', {
        defaultMessage: 'Synonyms Set',
      }),
      render: (name: string) => <div data-test-subj="synonyms-set-item-name">{name}</div>,
    },
    {
      field: 'ruleCount',
      name: i18n.translate('xpack.searchSynonyms.synonymsSetTable.ruleCount', {
        defaultMessage: 'Rule Count',
      }),
      render: (ruleCount: number) => (
        <div data-test-subj="synonyms-set-item-rule-count">{ruleCount}</div>
      ),
    },
    {
      actions: [
        {
          render: (item: SynonymSet) => (
            <EuiPopover
              closePopover={() => {
                setIsPopoverOpen(false);
              }}
              isOpen={isPopoverOpen}
              button={
                <EuiButtonIcon
                  iconType="boxesHorizontal"
                  data-test-subj="synonyms-set-item-actions"
                  onClick={() => {
                    setIsPopoverOpen(!isPopoverOpen);
                  }}
                  aria-label={i18n.translate(
                    'xpack.searchSynonyms.synonymsSetTable.actionsButton.ariaLabel',
                    {
                      defaultMessage: 'Press to open the actions menu for {name}',
                      values: { name: item.name },
                    }
                  )}
                />
              }
            >
              <EuiContextMenuPanel
                data-test-subj="synonyms-set-item-action-popover-panel"
                items={[<EuiContextMenuItem key="edit" icon="pencil" onClick={() => {}} />]}
              />
            </EuiPopover>
          ),
        },
      ],
    },
  ];
  return (
    <div>
      <EuiBasicTable
        data-test-subj="synonyms-set-table"
        items={items}
        columns={columns}
        pagination={pagination}
        onChange={() => {}}
      />
    </div>
  );
};
