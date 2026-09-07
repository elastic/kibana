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
import { useKibana } from '@kbn/kibana-react-plugin/public';
import type { CPSPluginStart } from '@kbn/cps/public';
import React, { useCallback, useEffect, useRef, useMemo } from 'react';
import { Subscription, of } from 'rxjs';
import useObservable from 'react-use/lib/useObservable';
import {
  DATASTREAM_DATASET,
  findInventoryModel,
  type DataSchemaFormat,
} from '@kbn/metrics-data-access-plugin/common';
import { NOT_AVAILABLE_LABEL } from '@kbn/observability-plugin/common';
import { DEFAULT_SCHEMA } from '../../../../../../common/constants';
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

  // Forward the active CPS (cross-project search) scope so options list suggestions
  // query the same projects as the wrapped infra HTTP client (`x-project-routing`).
  const { services } = useKibana<{ cps?: CPSPluginStart }>();
  const cpsManager = services.cps?.cpsManager;
  const projectRouting = useObservable(
    useMemo(() => cpsManager?.getProjectRouting$() ?? of(undefined), [cpsManager]),
    cpsManager?.getProjectRouting()
  );

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
        projectRouting={projectRouting}
      />
      <SchemaSelector
        onChange={onPreferredSchemaChange}
        schemas={schemas}
        value={schema ?? DEFAULT_SCHEMA}
        isLoading={isLoading}
      />
    </ControlGroupContainer>
  );
};

const ControlGroupContainer = styled.div`
  display: flex;
  flex-direction: row;
  align-items: start;
  gap: ${(props) => props.theme.euiTheme.size.s};
  flex-wrap: wrap;
  min-height: ${(props) => props.theme.euiTheme.size.xxl};

  .controlGroup {
    display: contents;
  }
`;
