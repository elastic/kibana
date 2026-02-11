/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  ControlGroupRenderer,
  type ControlPanelsState,
  type ControlGroupRendererApi,
  type ControlGroupRuntimeState,
} from '@kbn/control-group-renderer';
import type { DataView } from '@kbn/data-views-plugin/public';
import type { Filter, Query, TimeRange } from '@kbn/es-query';
import styled from '@emotion/styled';
import { useControlPanels } from '@kbn/observability-shared-plugin/public';
import type { DataControlApi } from '@kbn/controls-plugin/public';
import React, { useCallback, useEffect, useMemo, useRef } from 'react';
import { Subscription } from 'rxjs';
import type { DataSchemaFormat } from '@kbn/metrics-data-access-plugin/common';
import { useTimeRangeMetadataContext } from '../../../../../hooks/use_time_range_metadata';
import { SchemaSelector } from '../../../../../components/schema_selector';
import { getControlPanelConfigs } from './control_panels_config';
import { ControlTitle } from './controls_title';
import { useUnifiedSearchContext } from '../../hooks/use_unified_search';
import { isPending } from '../../../../../hooks/use_fetcher';

interface Props {
  dataView: DataView | undefined;
  timeRange: TimeRange;
  filters: Filter[];
  query: Query;

  schema: DataSchemaFormat | null;
  schemas: DataSchemaFormat[];
  onFiltersChange: (filters: Filter[]) => void;
}

export const ControlsContent = ({
  dataView,
  filters,
  query,
  timeRange,
  schema,
  onFiltersChange,
  schemas,
}: Props) => {
  const controlConfigs = useMemo(() => getControlPanelConfigs(schema), [schema]);
  const [controlPanels, setControlPanels] = useControlPanels(controlConfigs.controls, dataView);
  const controlGroupAPI = useRef<ControlGroupRendererApi | undefined>();
  const subscriptions = useRef<Subscription>(new Subscription());
  const { onPreferredSchemaChange } = useUnifiedSearchContext();
  const { status } = useTimeRangeMetadataContext();

  const isLoading = isPending(status);

  const getInitialInput = useCallback(async () => {
    const initialInput: Partial<ControlGroupRuntimeState> = {
      initialChildControlState: controlPanels as ControlPanelsState,
    };

    return { initialState: initialInput };
  }, [controlPanels]);

  useEffect(() => {
    const current = controlGroupAPI.current;
    if (!current || !controlConfigs.replace) {
      return;
    }

    Object.entries(controlConfigs.replace).forEach(([key, replaceable]) => {
      current.replacePanel(key, {
        panelType: replaceable.control.type,
        maybePanelId: replaceable.key,
        serializedState: {
          id: replaceable.key,
          ...replaceable.control,
          dataViewId: dataView?.id,
        },
      });
    });
  }, [schema, controlConfigs, dataView?.id]);

  const loadCompleteHandler = useCallback(
    (controlGroup: ControlGroupRendererApi) => {
      if (!controlGroup) return;

      controlGroupAPI.current = controlGroup;

      subscriptions.current.add(
        controlGroup.children$.subscribe((children) => {
          Object.keys(children).map((childId) => {
            const child = children[childId] as DataControlApi;

            child.CustomPrependComponent = () => (
              <ControlTitle title={child.title$.getValue()} embeddableId={childId} />
            );
          });
        })
      );

      subscriptions.current.add(
        controlGroup.appliedFilters$.subscribe((newFilters = []) => {
          onFiltersChange(newFilters);
        })
      );

      subscriptions.current.add(
        controlGroup
          .getInput$()
          .subscribe(({ initialChildControlState }) => setControlPanels(initialChildControlState))
      );
    },
    [onFiltersChange, setControlPanels]
  );

  useEffect(() => {
    const currentSubscriptions = subscriptions.current;

    return () => {
      currentSubscriptions.unsubscribe();
    };
  }, []);

  if (!dataView) {
    return null;
  }

  return (
    <ControlGroupContainer>
      <ControlGroupRenderer
        getCreationOptions={getInitialInput}
        onApiAvailable={loadCompleteHandler}
        timeRange={timeRange}
        query={query}
        filters={filters}
      />
      <SchemaSelector
        isHostsView
        onChange={onPreferredSchemaChange}
        schemas={schemas}
        value={schema ?? 'semconv'}
        isLoading={isLoading}
      />
    </ControlGroupContainer>
  );
};

const ControlGroupContainer = styled.div`
  .controlGroup {
    min-height: ${(props) => props.theme.euiTheme.size.xxl};
    align-items: start;
    margin-bottom: ${(props) => props.theme.euiTheme.size.s};
  }
`;
