/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  EuiButtonIcon,
  EuiCode,
  EuiHealth,
  EuiIcon,
  EuiLink,
  EuiScreenReaderOnly,
  EuiToolTip,
  type EuiBasicTableColumn,
  type IconColor,
} from '@elastic/eui';
import React, { useMemo } from 'react';
import { FormattedMessage } from '@kbn/i18n-react';
import { i18n } from '@kbn/i18n';
import {
  EngineComponentResourceEnum,
  type EngineComponentResource,
  type EngineComponentStatus,
} from '../../../../../../../common/api/entity_analytics';
import { useKibana } from '../../../../../../common/lib/kibana';
import { formatTaskName } from '../format';

type TableColumn = EuiBasicTableColumn<EngineComponentStatus>;

export const HEALTH_COLOR: Record<Required<EngineComponentStatus>['health'], IconColor> = {
  green: 'success',
  unknown: 'subdued',
  yellow: 'warning',
  red: 'danger',
  unavailable: 'danger',
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
  ilm_policy: 'ILM Policy',
  data_stream: 'Data stream',
};

/** Sentence case names, for the readable table. */
const RESOURCE_TO_READABLE_TEXT: Record<EngineComponentResource, string> = {
  ingest_pipeline: 'Ingest pipeline',
  enrich_policy: 'Enrich policy',
  index: 'Index',
  component_template: 'Component template',
  task: 'Task',
  transform: 'Transform',
  entity_definition: 'Entity definition',
  entity_engine: 'Engine',
  index_template: 'Index template',
  ilm_policy: 'ILM policy',
  data_stream: 'Data stream',
};

const HEALTH_LABEL: Record<Required<EngineComponentStatus>['health'], string> = {
  green: i18n.translate('xpack.securitySolution.entityAnalytics.entityStore.health.healthy', {
    defaultMessage: 'Healthy',
  }),
  yellow: i18n.translate('xpack.securitySolution.entityAnalytics.entityStore.health.degraded', {
    defaultMessage: 'Degraded',
  }),
  red: i18n.translate('xpack.securitySolution.entityAnalytics.entityStore.health.failing', {
    defaultMessage: 'Failing',
  }),
  unavailable: i18n.translate(
    'xpack.securitySolution.entityAnalytics.entityStore.health.unavailable',
    { defaultMessage: 'Unavailable' }
  ),
  unknown: i18n.translate('xpack.securitySolution.entityAnalytics.entityStore.health.unknown', {
    defaultMessage: 'Unknown',
  }),
};

const INSTALLED_LABEL = i18n.translate(
  'xpack.securitySolution.entityAnalytics.entityStore.installed.installed',
  { defaultMessage: 'Installed' }
);
const MISSING_LABEL = i18n.translate(
  'xpack.securitySolution.entityAnalytics.entityStore.installed.missing',
  { defaultMessage: 'Missing' }
);

/**
 * With `readable`, the table spells states out in words (color is never the only signal),
 * uses sentence case, and names tasks in plain language with the id in a tooltip.
 */
export const useColumns = (
  onToggleExpandedItem: (item: EngineComponentStatus) => void,
  expandedItems: EngineComponentStatus[],
  readable = false
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
        width: '12em',
        render: (resource: EngineComponentStatus['resource']) =>
          readable ? RESOURCE_TO_READABLE_TEXT[resource] : RESOURCE_TO_TEXT[resource],
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

          if (readable && resource === EngineComponentResourceEnum.task) {
            return (
              <EuiToolTip content={id}>
                <span tabIndex={0}>{formatTaskName(id)}</span>
              </EuiToolTip>
            );
          }

          const label = readable ? <EuiCode transparentBackground>{id}</EuiCode> : id;

          if (!installed || !path) {
            return label;
          }

          return (
            <EuiLink
              target="_blank"
              href={getUrlForApp('management', {
                path,
              })}
            >
              {label}
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
        width: readable ? '9em' : '6em',
        align: readable ? 'left' : 'center',
        render: (value: boolean) =>
          readable ? (
            <EuiHealth color={value ? 'success' : 'danger'} data-test-subj="installation-status">
              {value ? INSTALLED_LABEL : MISSING_LABEL}
            </EuiHealth>
          ) : value ? (
            <EuiIcon
              data-test-subj="installation-status"
              type="check"
              color="success"
              size="l"
              aria-hidden={true}
            />
          ) : (
            <EuiIcon
              data-test-subj="installation-status"
              type="cross"
              color="danger"
              size="l"
              aria-hidden={true}
            />
          ),
      },
      {
        name: (
          <FormattedMessage
            id="xpack.securitySolution.entityAnalytics.entityStore.enginesStatus.healthColumnTitle"
            defaultMessage="Health"
          />
        ),
        width: readable ? '9em' : '6em',
        align: readable ? 'left' : 'center',
        render: ({ installed, resource, health }: EngineComponentStatus) => {
          if (!installed) {
            return readable ? '—' : null;
          }

          const color = HEALTH_COLOR[health ?? 'green'];
          return readable ? (
            <EuiHealth color={color}>{HEALTH_LABEL[health ?? 'green']}</EuiHealth>
          ) : (
            <EuiHealth color={color} />
          );
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

          const collapseLabel = i18n.translate(
            'xpack.securitySolution.entityAnalytics.entityStore.enginesStatus.collapse',
            { defaultMessage: 'Collapse' }
          );
          const expandLabel = i18n.translate(
            'xpack.securitySolution.entityAnalytics.entityStore.enginesStatus.expand',
            { defaultMessage: 'Expand' }
          );
          const label = isItemExpanded ? collapseLabel : expandLabel;

          return component.errors && component.errors.length > 0 ? (
            <EuiToolTip content={label} disableScreenReaderOutput>
              <EuiButtonIcon
                onClick={() => onToggleExpandedItem(component)}
                aria-label={label}
                iconType={isItemExpanded ? 'chevronSingleDown' : 'chevronSingleRight'}
              />
            </EuiToolTip>
          ) : null;
        },
      },
    ],
    [expandedItems, getUrlForApp, onToggleExpandedItem, readable]
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
    return `data/transform?_a=(transform:(queryText:'${id}'))`;
  }

  if (resource === EngineComponentResourceEnum.ilm_policy) {
    return `data/index_lifecycle_management/policies?policy=${id}`;
  }

  if (resource === EngineComponentResourceEnum.data_stream) {
    return `data/index_management/data_streams/${id}`;
  }
  return null;
};
