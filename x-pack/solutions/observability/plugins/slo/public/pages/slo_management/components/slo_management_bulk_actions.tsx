/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiButtonEmpty, EuiContextMenu, EuiIcon, EuiPopover } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { SLODefinitionResponse } from '@kbn/slo-schema';
import React from 'react';
import { useActionModal } from '../../../context/action_modal';

export function SloManagementBulkActions({
  items,
  setSelectedItems,
}: {
  items: SLODefinitionResponse[];
  setSelectedItems: Function;
}) {
  const { triggerAction } = useActionModal();
  const [isOpen, setIsOpen] = React.useState(false);

  const resetSelectedItems = () => {
    setSelectedItems([]);
  };

  const panels = [
    {
      id: 0,
      hasFocus: false,
      items: [
        {
          'data-test-subj': 'sloSloManagementTableBulkDeleteButton',
          onClick: () => {
            triggerAction({ items, type: 'bulk_delete' });
            setIsOpen(false);
          },
          name: i18n.translate(
            'xpack.slo.sloManagementTable.sloSloManagementTableBulkDeleteButtonLabel',
            {
              defaultMessage: 'Delete',
            }
          ),
        },
        {
          'data-test-subj': 'sloSloManagementTableBulkPurgeButton',
          onClick: () => {
            triggerAction({
              items,
              type: 'bulk_purge',
              onConfirm() {
                resetSelectedItems();
              },
            });
            setIsOpen(false);
          },
          name: i18n.translate(
            'xpack.slo.sloManagementTable.sloSloManagementTableBulkPurgeButtonLabel',
            {
              defaultMessage: 'Purge Rollup Data',
            }
          ),
        },
      ],
    },
  ];

  return (
    <EuiPopover
      id={`popover-slo-management-bulk-actions`}
      panelPaddingSize="none"
      button={
        <EuiButtonEmpty
          data-test-subj="sloManagementTableBulkMenuButton"
          css={{ blockSize: '0px', marginBottom: '5px' }}
          size="xs"
          onClick={() => setIsOpen(!isOpen)}
        >
          {i18n.translate('xpack.slo.sloManagementTable.sloSloManagementTableBulkMenuLabel', {
            defaultMessage: 'Perform bulk action on {count} SLOs',
            values: {
              count: items.length,
            },
          })}{' '}
          <EuiIcon type="arrowDown" size="s" />
        </EuiButtonEmpty>
      }
      isOpen={isOpen}
      closePopover={() => setIsOpen(false)}
      anchorPosition="downLeft"
    >
      <EuiContextMenu
        initialPanelId={0}
        size="s"
        panels={panels}
        className="actDetailsCollapsedItemActions"
        data-test-subj="detailsCollapsedActionPanel"
        data-testid="detailsCollapsedActionPanel"
      />
    </EuiPopover>
  );
}
