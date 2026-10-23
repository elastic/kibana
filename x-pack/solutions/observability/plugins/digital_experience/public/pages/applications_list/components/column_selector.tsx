/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useState } from 'react';
import { css } from '@emotion/react';
import {
  EuiButtonEmpty,
  EuiNotificationBadge,
  EuiPopover,
  EuiSelectable,
  useGeneratedHtmlId,
} from '@elastic/eui';
import type { EuiSelectableOption } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { getEbtProps } from '@kbn/ebt-click';
import {
  APPLICATIONS_LIST_EBT_ELEMENTS,
  DIGITAL_EXPERIENCE_EBT_ACTIONS,
} from '../../../ebt_constants';

const COLUMNS_LABEL = i18n.translate('xpack.digitalExperience.columnSelector.label', {
  defaultMessage: 'Columns',
});

const listCss = css({ inlineSize: 240 });

/** A "Columns 6/9" button that opens a list to show or hide the table's optional columns. */
export function ColumnSelector<TColumnId extends string>({
  columns,
  visibleColumns,
  onChange,
}: {
  columns: Array<{ id: TColumnId; label: string }>;
  visibleColumns: ReadonlySet<TColumnId>;
  onChange: (visibleColumnIds: TColumnId[]) => void;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const popoverId = useGeneratedHtmlId({ prefix: 'digitalExperienceColumnSelector' });

  const options: Array<EuiSelectableOption<{ columnId: TColumnId }>> = columns.map(
    ({ id, label }) => ({
      key: id,
      columnId: id,
      label,
      checked: visibleColumns.has(id) ? 'on' : undefined,
      'data-test-subj': `digitalExperienceColumnSelectorOption-${id}`,
    })
  );

  return (
    <EuiPopover
      id={popoverId}
      aria-label={COLUMNS_LABEL}
      isOpen={isOpen}
      closePopover={() => setIsOpen(false)}
      panelPaddingSize="none"
      anchorPosition="downRight"
      button={
        <EuiButtonEmpty
          data-test-subj="digitalExperienceColumnSelector"
          {...getEbtProps({
            action: DIGITAL_EXPERIENCE_EBT_ACTIONS.SELECT_COLUMNS,
            element: APPLICATIONS_LIST_EBT_ELEMENTS.COLUMN_SELECTOR,
          })}
          size="s"
          color="text"
          iconType="table"
          onClick={() => setIsOpen((open) => !open)}
        >
          {COLUMNS_LABEL}{' '}
          <EuiNotificationBadge color="subdued">
            {`${visibleColumns.size}/${columns.length}`}
          </EuiNotificationBadge>
        </EuiButtonEmpty>
      }
    >
      <EuiSelectable<{ columnId: TColumnId }>
        data-test-subj="digitalExperienceColumnSelectorList"
        aria-label={COLUMNS_LABEL}
        options={options}
        onChange={(newOptions) =>
          onChange(
            newOptions.filter(({ checked }) => checked === 'on').map(({ columnId }) => columnId)
          )
        }
        listProps={{ isVirtualized: false }}
      >
        {(list) => <div css={listCss}>{list}</div>}
      </EuiSelectable>
    </EuiPopover>
  );
}
