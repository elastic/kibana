/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { css } from '@emotion/react';
import type { DataView } from '@kbn/data-views-plugin/common';
import type { Filter } from '@kbn/es-query';
import { i18n } from '@kbn/i18n';
import { ControlGroupRenderer, type ControlGroupRendererApi } from '@kbn/control-group-renderer';
import { isEmpty } from 'lodash';
import React, { useEffect, useState } from 'react';
import { skip } from 'rxjs';
import type { SearchState } from '../../hooks/use_url_search_state';

interface Props {
  initialState: SearchState;
  loading: boolean;
  dataView?: DataView;
  onStateChange: (newState: Partial<SearchState>) => void;
}

export function QuickFilters({
  dataView,
  initialState: { tagsFilter, statusFilter },
  onStateChange,
}: Props) {
  const [controlGroupAPI, setControlGroupAPI] = useState<ControlGroupRendererApi | undefined>();

  useEffect(() => {
    if (!controlGroupAPI) {
      return;
    }
    const subscription = controlGroupAPI.appliedFilters$
      .pipe(skip(1))
      .subscribe((newFilters = []) => {
        if (newFilters.length === 0) {
          onStateChange({ tagsFilter: undefined, statusFilter: undefined });
        } else {
          onStateChange({
            tagsFilter: newFilters.filter((filter) => filter.meta.key === 'slo.tags')?.[0],
            statusFilter: newFilters.filter((filter) => filter.meta.key === 'status')?.[0],
          });
        }
      });
    return () => {
      subscription.unsubscribe();
    };
  }, [controlGroupAPI, onStateChange]);

  if (!dataView) {
    return null;
  }

  return (
    <div
      css={css`
        .controlsWrapper {
          align-items: flex-start;
          min-height: initial;
        }
        .controlPanel {
          height: initial;
        }
        .controlGroup {
          min-height: initial;
        }
      `}
    >
      <ControlGroupRenderer
        onApiAvailable={setControlGroupAPI}
        getCreationOptions={async (initialState, builder) => {
          builder.addOptionsListControl(
            initialState,
            {
              data_view_id: dataView.id!,
              field_name: 'status',
              width: 'small',
              grow: true,
              title: STATUS_LABEL,
              exclude: statusFilter?.meta?.negate,
              selected_options: getSelectedOptions(statusFilter),
              exists_selected: Boolean(statusFilter?.query?.exists?.field === 'status'),
              display_settings: { placeholder: ALL_LABEL },
            },
            'slo-status-filter'
          );
          builder.addOptionsListControl(
            initialState,
            {
              data_view_id: dataView.id!,
              title: TAGS_LABEL,
              field_name: 'slo.tags',
              width: 'small',
              grow: false,
              selected_options: getSelectedOptions(tagsFilter),
              exclude: statusFilter?.meta?.negate,
              exists_selected: Boolean(tagsFilter?.query?.exists?.field === 'slo.tags'),
              display_settings: { placeholder: ALL_LABEL },
            },
            'slo-tags-filter'
          );
          return {
            initialState,
          };
        }}
        timeRange={{ from: 'now-24h', to: 'now' }}
        compressed
      />
    </div>
  );
}

export const getSelectedOptions = (filter?: Filter) => {
  if (isEmpty(filter)) {
    return [];
  }
  if (filter?.meta?.params && Array.isArray(filter?.meta.params)) {
    return filter?.meta.params;
  }
  if (filter?.query?.match_phrase?.status) {
    return [filter.query.match_phrase.status];
  }
  if (filter?.query?.match_phrase?.['slo.tags']) {
    return [filter?.query.match_phrase?.['slo.tags']];
  }
  return [];
};

const TAGS_LABEL = i18n.translate('xpack.slo.list.tags', {
  defaultMessage: 'Tags',
});
const STATUS_LABEL = i18n.translate('xpack.slo.list.status', {
  defaultMessage: 'Status',
});
const ALL_LABEL = i18n.translate('xpack.slo.list.all', {
  defaultMessage: 'All',
});
