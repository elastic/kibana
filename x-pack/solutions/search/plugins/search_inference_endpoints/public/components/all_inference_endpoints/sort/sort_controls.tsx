/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useMemo, useState } from 'react';
import type { EuiContextMenuPanelDescriptor } from '@elastic/eui';
import { EuiPopover, EuiContextMenu, EuiFilterButton, EuiFilterGroup } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import type { SortOption } from '../types';

interface SortControlsProps {
  sort: SortOption;
  onChange: (sort: SortOption) => void;
}

const SORT_LABELS: Record<SortOption['field'], string> = {
  inference_id: i18n.translate('xpack.searchInferenceEndpoints.sortControls.nameLabel', {
    defaultMessage: 'Name',
  }),
  service: i18n.translate('xpack.searchInferenceEndpoints.sortControls.serviceLabel', {
    defaultMessage: 'Service',
  }),
  task_type: i18n.translate('xpack.searchInferenceEndpoints.sortControls.typeLabel', {
    defaultMessage: 'Type',
  }),
  model: i18n.translate('xpack.searchInferenceEndpoints.sortControls.modelLabel', {
    defaultMessage: 'Model',
  }),
};

export const SortControls: React.FC<SortControlsProps> = ({ sort, onChange }) => {
  const [isOpen, setIsOpen] = useState<boolean>(false);

  const togglePopover = useCallback(() => setIsOpen((currentIsOpen) => !currentIsOpen), []);
  const closePopover = useCallback(() => setIsOpen(false), []);

  const selectField = useCallback(
    (field: SortOption['field']) => {
      onChange({ ...sort, field });
      closePopover();
    },
    [closePopover, onChange, sort]
  );

  const panels = useMemo<EuiContextMenuPanelDescriptor[]>(
    () => [
      {
        id: 0,
        title: '',
        items: (Object.keys(SORT_LABELS) as Array<SortOption['field']>).map((field) => ({
          name: SORT_LABELS[field],
          icon: sort.field === field ? 'check' : 'empty',
          onClick: () => selectField(field),
          'data-test-subj': `sortBy${field}`,
        })),
      },
    ],
    [sort.field, selectField]
  );

  const button = (
    <EuiFilterButton
      iconType="arrowDown"
      onClick={togglePopover}
      isSelected={isOpen}
      data-test-subj="inferenceEndpointsSortDropdown"
    >
      {i18n.translate('xpack.searchInferenceEndpoints.sortControls.buttonLabel', {
        defaultMessage: 'Sort: {sortField}',
        values: { sortField: SORT_LABELS[sort.field] },
      })}
    </EuiFilterButton>
  );

  return (
    <EuiFilterGroup>
      <EuiPopover
        isOpen={isOpen}
        id="sortPopover"
        button={button}
        anchorPosition="downLeft"
        panelPaddingSize="none"
        closePopover={closePopover}
      >
        <EuiContextMenu initialPanelId={0} panels={panels} />
      </EuiPopover>
    </EuiFilterGroup>
  );
};
