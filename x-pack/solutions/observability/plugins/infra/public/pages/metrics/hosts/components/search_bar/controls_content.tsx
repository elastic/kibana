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
import { buildCustomFilter, type Filter, type Query, type TimeRange } from '@kbn/es-query';
import { FilterStateStore } from '@kbn/es-query-constants';
import styled from '@emotion/styled';
import { useControlPanels } from '@kbn/observability-shared-plugin/public';
import type { DataControlApi } from '@kbn/controls-plugin/public';
import React, { useCallback, useEffect, useRef, useMemo } from 'react';
import { Subscription } from 'rxjs';
import {
  DATASTREAM_DATASET,
  findInventoryModel,
  type DataSchemaFormat,
} from '@kbn/metrics-data-access-plugin/common';
import { NOT_AVAILABLE_LABEL } from '@kbn/observability-plugin/common';
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
  const schemaFilters = useMemo(() => {
    if (!schema || !dataView?.id) return [];
    const inventoryModel = findInventoryModel('host');
    const nodeFilterQueries = inventoryModel.nodeFilter?.({ schema }) ?? [];

    const apmDatasetFilter: Record<string, object> =
      schema === 'ecs'
        ? { prefix: { [DATASTREAM_DATASET]: { value: 'apm.transaction.' } } }
        : { wildcard: { [DATASTREAM_DATASET]: { value: 'transaction.*.otel' } } };

    const shouldClauses = [...nodeFilterQueries, apmDatasetFilter];

    return [
      buildCustomFilter(
        dataView.id!,
        {
          bool: {
            should: shouldClauses,
            minimum_should_match: 1,
          },
        },
        false,
        false,
        null,
        FilterStateStore.APP_STATE
      ),
    ];
  }, [schema, dataView?.id]);
  const [controlPanels, setControlPanels] = useControlPanels(controlConfigs.controls, dataView);
  const controlGroupAPI = useRef<ControlGroupRendererApi | undefined>();
  const subscriptions = useRef<Subscription>(new Subscription());
  const { onPreferredSchemaChange } = useUnifiedSearchContext();
  const { status } = useTimeRangeMetadataContext();

  const isLoading = isPending(status);

  const getInitialInput = useCallback(async () => {
    const initialInput: ControlGroupRuntimeState = {
      initialChildControlState: controlPanels as ControlPanelsState,
    };

    return { initialState: initialInput };
  }, [controlPanels]);

  const loadCompleteHandler = useCallback(
    (controlGroup: ControlGroupRendererApi) => {
      if (!controlGroup) return;

      controlGroupAPI.current = controlGroup;

      subscriptions.current.unsubscribe();
      subscriptions.current = new Subscription();

      subscriptions.current.add(
        controlGroup.children$.subscribe((children) => {
          Object.keys(children).map((childId) => {
            const child = children[childId] as DataControlApi;

            child.CustomPrependComponent = () => (
              <ControlTitle
                title={child.title$?.getValue() ?? NOT_AVAILABLE_LABEL}
                embeddableId={childId}
              />
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
    return () => {
      subscriptions.current.unsubscribe();
    };
  }, []);

  if (!dataView) {
    return null;
  }

  return (
    <ControlGroupContainer>
      <ControlGroupRenderer
        key={schema ?? 'default'}
        getCreationOptions={getInitialInput}
        onApiAvailable={loadCompleteHandler}
        timeRange={timeRange}
        query={query}
        filters={[...filters, ...schemaFilters]}
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
