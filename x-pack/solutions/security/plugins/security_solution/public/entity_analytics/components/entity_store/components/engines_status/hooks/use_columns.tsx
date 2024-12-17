/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { IconColor } from '@elastic/eui';
import {
  EuiLink,
  type EuiBasicTableColumn,
  EuiHealth,
  EuiScreenReaderOnly,
  EuiButtonIcon,
  EuiIcon,
} from '@elastic/eui';
import React, { useMemo } from 'react';
import { FormattedMessage } from '@kbn/i18n-react';
import {
  EngineComponentResourceEnum,
  type EngineComponentResource,
} from '../../../../../../../common/api/entity_analytics';
import type { EngineComponentStatus } from '../../../../../../../common/api/entity_analytics';
import { useKibana } from '../../../../../../common/lib/kibana';

type TableColumn = EuiBasicTableColumn<EngineComponentStatus>;

export const HEALTH_COLOR: Record<Required<EngineComponentStatus>['health'], IconColor> = {
  green: 'success',
  unknown: 'subdued',
  yellow: 'warning',
  red: 'danger',
} as const;

const RESOURCE_TO_TEXT: Record<EngineComponentResource, string> = {
  ingest_pipeline: 'Ingest Pipeline',
  enrich_policy: 'Enrich Policy',
  index: 'Index',
  component_template: 'Component Template',
  task: 'Task',
  transform: 'Transform',
  entity_definition: 'Entity Definition',
  entity_engine: 'Engine',
  index_template: 'Index Template',
};

export const useColumns = (
  onToggleExpandedItem: (item: EngineComponentStatus) => void,
  expandedItems: EngineComponentStatus[]
): TableColumn[] => {
  const { getUrlForApp } = useKibana().services.application;

  return useMemo(
    () => [
      {
        field: 'resource',
        name: (
          <FormattedMessage
            id="xpack.securitySolution.entityAnalytics.entityStore.enginesStatus.resourceColumnTitle"
            defaultMessage="Resource"
          />
        ),
        width: '20%',
        render: (resource: EngineComponentStatus['resource']) => RESOURCE_TO_TEXT[resource],
      },
      {
        field: 'id',
        name: (
          <FormattedMessage
            id="xpack.securitySolution.entityAnalytics.entityStore.enginesStatus.idColumnTitle"
            defaultMessage="Identifier"
          />
        ),
        render: (id: EngineComponentStatus['id'], { resource, installed }) => {
          const path = getResourcePath(id, resource);

          if (!installed || !path) {
            return id;
          }

          return (
            <EuiLink
              target="_blank"
              href={getUrlForApp('management', {
                path,
              })}
            >
              {id}
            </EuiLink>
          );
        },
      },
      {
        field: 'installed',
        name: (
          <FormattedMessage
            id="xpack.securitySolution.entityAnalytics.entityStore.enginesStatus.installedColumnTitle"
            defaultMessage="Installed"
          />
        ),
        width: '10%',
        align: 'center',
        render: (value: boolean) =>
          value ? (
            <EuiIcon data-test-subj="installation-status" type="check" color="success" size="l" />
          ) : (
            <EuiIcon data-test-subj="installation-status" type="cross" color="danger" size="l" />
          ),
      },
      {
        name: (
          <FormattedMessage
            id="xpack.securitySolution.entityAnalytics.entityStore.enginesStatus.healthColumnTitle"
            defaultMessage="Health"
          />
        ),
        width: '10%',
        align: 'center',
        render: ({ installed, resource, health }: EngineComponentStatus) => {
          if (!installed) {
            return null;
          }

          return <EuiHealth color={HEALTH_COLOR[health ?? 'green']} />;
        },
      },
      {
        isExpander: true,
        align: 'right',
        width: '40px',
        name: (
          <EuiScreenReaderOnly>
            <span>
              <FormattedMessage
                id="xpack.securitySolution.entityAnalytics.entityStore.enginesStatus.expandRow"
                defaultMessage="Expand row"
              />
            </span>
          </EuiScreenReaderOnly>
        ),
        mobileOptions: { header: false },
        render: (component: EngineComponentStatus) => {
          const isItemExpanded = expandedItems.includes(component);

          return component.errors && component.errors.length > 0 ? (
            <EuiButtonIcon
              onClick={() => onToggleExpandedItem(component)}
              aria-label={isItemExpanded ? 'Collapse' : 'Expand'}
              iconType={isItemExpanded ? 'arrowDown' : 'arrowRight'}
            />
          ) : null;
        },
      },
    ],
    [expandedItems, getUrlForApp, onToggleExpandedItem]
  );
};

const getResourcePath = (id: string, resource: EngineComponentResource) => {
  if (resource === EngineComponentResourceEnum.ingest_pipeline) {
    return `ingest/ingest_pipelines?pipeline=${id}`;
  }

  if (resource === EngineComponentResourceEnum.index_template) {
    return `data/index_management/templates/${id}`;
  }

  if (resource === EngineComponentResourceEnum.index) {
    return `data/index_management/indices/index_details?indexName=${id}`;
  }

  if (resource === EngineComponentResourceEnum.component_template) {
    return `data/index_management/component_templates/${id}`;
  }

  if (resource === EngineComponentResourceEnum.enrich_policy) {
    return `data/index_management/enrich_policies?policy=${id}`;
  }

  if (resource === EngineComponentResourceEnum.transform) {
    return `data/transform/enrich_policies?_a=(transform:(queryText:'${id}'))`;
  }
  return null;
};
