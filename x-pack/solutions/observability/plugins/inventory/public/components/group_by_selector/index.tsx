/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiButtonEmpty, EuiContextMenu, EuiPopover } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';
import React, { useCallback, useState } from 'react';

const ENTITY_TYPE_LABEL = i18n.translate('xpack.inventory.groupedInventoryPage.typeLabel', {
  defaultMessage: 'Type',
});

export function GroupBySelector() {
  const [isPopoverOpen, setIsPopoverOpen] = useState(false);

  const panels = [
    {
      id: 'firstPanel',
      title: i18n.translate('xpack.inventory.groupedInventoryPage.groupSelectorLabel', {
        defaultMessage: 'Select grouping',
      }),
      items: [
        {
          'data-test-subj': 'panelType',
          name: ENTITY_TYPE_LABEL,
          icon: 'check',
        },
      ],
    },
  ];

  const onButtonClick = useCallback(() => setIsPopoverOpen((currentVal) => !currentVal), []);

  const closePopover = useCallback(() => setIsPopoverOpen(false), []);

  const button = (
    <EuiButtonEmpty
      data-test-subj="groupSelectorDropdown"
      iconSide="right"
      iconSize="s"
      iconType="arrowDown"
      onClick={onButtonClick}
      title={ENTITY_TYPE_LABEL}
      size="s"
    >
      <FormattedMessage
        id="xpack.inventory.groupedInventoryPage.groupedByLabel"
        defaultMessage={`Group entities by: {grouping}`}
        values={{ grouping: ENTITY_TYPE_LABEL }}
      />
    </EuiButtonEmpty>
  );

  return (
    <EuiPopover
      data-test-subj="inventoryGroupsPopover"
      button={button}
      closePopover={closePopover}
      isOpen={isPopoverOpen}
      panelPaddingSize="none"
    >
      <EuiContextMenu
        data-test-subj="entitiesGroupByContextMenu"
        initialPanelId="firstPanel"
        panels={panels}
      />
    </EuiPopover>
  );
}
