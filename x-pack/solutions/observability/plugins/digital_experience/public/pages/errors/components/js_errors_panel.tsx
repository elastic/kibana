/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useState } from 'react';
import { EuiInMemoryTable, EuiLink, EuiText } from '@elastic/eui';
import type { EuiBasicTableColumn } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { FormattedRelative } from '@kbn/i18n-react';
import { EBT_CLICK_ACTIONS, getEbtProps } from '@kbn/ebt-click';
import { EmptyCellValue } from '@kbn/shared-ux-column-presets';
import type { JsErrorGroup } from '../../../../common/types/errors';
import { DataPanel } from '../../../components/data_panel';
import { DIGITAL_EXPERIENCE_EBT_ACTIONS, ERRORS_EBT_ELEMENTS } from '../../../ebt_constants';
import { useFormatters } from '../../../hooks/use_formatters';
import { LAST_SEEN_LABEL, OCCURRENCES_LABEL } from '../../../labels';
import { metricColumnPreset, timeColumnPreset } from '../../../utils/column_presets';
import { JsErrorFlyout } from './js_error_flyout';

const TITLE = i18n.translate('xpack.digitalExperience.errors.table.title', {
  defaultMessage: 'JS errors',
});

const TOP_TITLE = i18n.translate('xpack.digitalExperience.errors.table.topTitle', {
  defaultMessage: 'Top JS errors',
});

const SUBTITLE = i18n.translate('xpack.digitalExperience.errors.table.subtitle', {
  defaultMessage: 'Grouped by type and stack trace. Open an error to see its stack trace.',
});

const ERROR_LABEL = i18n.translate('xpack.digitalExperience.errors.table.error', {
  defaultMessage: 'Error',
});

const EMPTY_MESSAGE = i18n.translate('xpack.digitalExperience.errors.table.empty', {
  defaultMessage: 'No JS errors in this time range.',
});

/** What identifies a group across responses: its type and stack trace. */
type ErrorGroupKey = Pick<JsErrorGroup, 'type' | 'stacktrace'>;

const VIEW_ALL_LABEL = i18n.translate('xpack.digitalExperience.errors.table.viewAll', {
  defaultMessage: 'View all errors',
});

/**
 * The errors grouped by type and stack trace, each row opening its stack trace in a flyout; with
 * `viewAllHref`, a compact list of the first `maxRows`.
 */
export function JsErrorsPanel({
  errors,
  isLoading,
  sessionsWithErrorsHref,
  maxRows,
  viewAllHref,
}: {
  errors: JsErrorGroup[];
  isLoading: boolean;
  /** The sessions of the application that had an error. */
  sessionsWithErrorsHref: string;
  /** Only the most frequent groups; all of them when left out. */
  maxRows?: number;
  /** The Errors tab, linked from the panel's header. */
  viewAllHref?: string;
}) {
  const { formatNumber, formatDate } = useFormatters();
  const [selectedKey, setSelectedKey] = useState<ErrorGroupKey>();
  // Looked up in the current errors, so the flyout never shows a stale group and closes without it.
  const selected =
    selectedKey &&
    errors.find(({ type, stacktrace }) => {
      return type === selectedKey.type && stacktrace === selectedKey.stacktrace;
    });
  const isCompact = maxRows !== undefined;
  const items = isCompact ? errors.slice(0, maxRows) : errors;

  const columns: Array<EuiBasicTableColumn<JsErrorGroup>> = [
    {
      field: 'type',
      name: ERROR_LABEL,
      render: (type: string, error) => {
        return (
          <div css={{ minWidth: 0 }}>
            <EuiLink
              onClick={() => {
                return setSelectedKey({ type: error.type, stacktrace: error.stacktrace });
              }}
              data-test-subj="digitalExperienceError"
              {...getEbtProps({
                action: EBT_CLICK_ACTIONS.VIEW_ERROR,
                element: ERRORS_EBT_ELEMENTS.ERROR,
              })}
            >
              {type}
            </EuiLink>
            {error.message && (
              <EuiText size="xs" color="subdued" className="eui-textTruncate" title={error.message}>
                {error.message}
              </EuiText>
            )}
          </div>
        );
      },
    },
    {
      field: 'count',
      name: OCCURRENCES_LABEL,
      sortable: !isCompact,
      ...metricColumnPreset<JsErrorGroup>(),
      render: (count: number) => {
        return formatNumber(count);
      },
    },
    {
      field: 'lastSeen',
      name: LAST_SEEN_LABEL,
      sortable: !isCompact,
      ...timeColumnPreset<JsErrorGroup>(),
      render: (lastSeen: string | null) => {
        return lastSeen === null ? (
          <EmptyCellValue />
        ) : (
          <span title={formatDate(lastSeen)}>
            <FormattedRelative value={new Date(lastSeen)} />
          </span>
        );
      },
    },
  ];

  return (
    <DataPanel
      title={isCompact ? TOP_TITLE : TITLE}
      subtitle={SUBTITLE}
      actions={
        viewAllHref && (
          <EuiLink
            href={viewAllHref}
            data-test-subj="digitalExperienceErrorsViewAll"
            {...getEbtProps({
              action: DIGITAL_EXPERIENCE_EBT_ACTIONS.VIEW_ALL,
              element: ERRORS_EBT_ELEMENTS.VIEW_ALL,
            })}
          >
            {VIEW_ALL_LABEL}
          </EuiLink>
        )
      }
      isLoading={isLoading}
      isEmpty={errors.length === 0}
      emptyMessage={EMPTY_MESSAGE}
      data-test-subj="digitalExperienceErrorsPanel"
    >
      <EuiInMemoryTable<JsErrorGroup>
        tableCaption={isCompact ? TOP_TITLE : TITLE}
        items={items}
        columns={columns}
        sorting={isCompact ? false : { sort: { field: 'count', direction: 'desc' } }}
      />
      {selected && (
        <JsErrorFlyout
          error={selected}
          sessionsWithErrorsHref={sessionsWithErrorsHref}
          onClose={() => {
            return setSelectedKey(undefined);
          }}
        />
      )}
    </DataPanel>
  );
}
