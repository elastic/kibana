/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useEffect, useState } from 'react';
import {
  EuiButton,
  EuiButtonIcon,
  EuiPanel,
  EuiTitle,
  EuiSpacer,
  EuiBasicTable,
  EuiLoadingSpinner,
  EuiText,
  EuiPageTemplate,
  EuiFlexGroup,
  EuiFlexItem,
  EuiToolTip,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import type { HttpStart } from '@kbn/core/public';
import type { DataPublicPluginStart } from '@kbn/data-plugin/public';
import type { DataView } from '@kbn/data-views-plugin/public';
import { fromKueryExpression, toElasticsearchQuery } from '@kbn/es-query';
import type { Query } from '@kbn/es-query';
import type { UnifiedSearchPublicPluginStart } from '@kbn/unified-search-plugin/public';
import type { EntityDefinition, DiscoveredEntity } from '../../common/entity_definition';
import type { MetadataFilter } from '../../common/metadata_filter';
import { useDefinitions } from '../hooks/use_definitions';
import { useRuntimeEntities } from '../hooks/use_runtime_entities';
import { useMetadataFields } from '../hooks/use_metadata_fields';
import { EntityMetadataFlyout } from './entity_metadata_flyout';
import { MetadataFilterBar } from './metadata_filter_bar';

interface DefinitionPanelProps {
  http: HttpStart;
  definition: EntityDefinition;
  start: string;
  end: string;
  dataViews: DataPublicPluginStart['dataViews'];
  SearchBar: UnifiedSearchPublicPluginStart['ui']['SearchBar'];
}

const DefinitionPanel = ({
  http,
  definition,
  start,
  end,
  dataViews,
  SearchBar,
}: DefinitionPanelProps) => {
  const [kqlQuery, setKqlQuery] = useState<Query>({ query: '', language: 'kuery' });
  const [activeFilter, setActiveFilter] = useState<Record<string, unknown> | undefined>();
  const [metadataFilters, setMetadataFilters] = useState<MetadataFilter[]>([]);
  const [dataView, setDataView] = useState<DataView | null>(null);
  const [editingEntityId, setEditingEntityId] = useState<string | null>(null);

  const { data: metadataFieldsData } = useMetadataFields(http, definition.id);
  const metadataFields = metadataFieldsData ?? [];

  const { data, isLoading, error } = useRuntimeEntities(
    http,
    definition.id,
    start,
    end,
    activeFilter,
    metadataFilters
  );
  const entities = data?.entities ?? [];

  // Create a transient (unsaved) data view for field autocomplete
  useEffect(() => {
    dataViews
      .create({ title: definition.indexPattern })
      .then(setDataView)
      .catch(() => setDataView(null));
  }, [dataViews, definition.indexPattern]);

  const handleKqlSubmit = useCallback(
    ({ query }: { dateRange?: unknown; query?: Query | unknown }) => {
      const q = query as Query | undefined;
      const kql = String(q?.query ?? '').trim();
      if (!kql) {
        setActiveFilter(undefined);
        return;
      }
      try {
        const esFilter = toElasticsearchQuery(fromKueryExpression(kql)) as Record<string, unknown>;
        setActiveFilter(esFilter);
      } catch {
        // Invalid KQL — clear filter
        setActiveFilter(undefined);
      }
    },
    []
  );

  const columns = [
    {
      field: 'entity.id' as const,
      name: 'entity.id',
    },
    ...definition.identityFields.map((field) => ({
      name: field,
      render: (item: DiscoveredEntity) => String(item.identityValues[field] ?? ''),
    })),
    {
      field: 'first_seen' as const,
      name: i18n.translate('xpack.entitiesRuntimeCaue.entities.colFirstSeen', {
        defaultMessage: 'first_seen',
      }),
      render: (v: string | null) => v ?? '—',
    },
    {
      field: 'last_seen' as const,
      name: i18n.translate('xpack.entitiesRuntimeCaue.entities.colLastSeen', {
        defaultMessage: 'last_seen',
      }),
    },
    {
      field: 'doc_count' as const,
      name: i18n.translate('xpack.entitiesRuntimeCaue.entities.colDocCount', {
        defaultMessage: 'Events',
      }),
    },
    {
      name: i18n.translate('xpack.entitiesRuntimeCaue.entities.colActions', {
        defaultMessage: 'Actions',
      }),
      width: '60px',
      render: (entity: DiscoveredEntity) => (
        <EuiToolTip
          content={i18n.translate('xpack.entitiesRuntimeCaue.entities.editMetadata', {
            defaultMessage: 'Edit metadata',
          })}
          disableScreenReaderOutput
        >
          <EuiButtonIcon
            iconType="pencil"
            aria-label={i18n.translate('xpack.entitiesRuntimeCaue.entities.editMetadata', {
              defaultMessage: 'Edit metadata',
            })}
            onClick={() => setEditingEntityId(entity['entity.id'])}
            data-test-subj="entityMetadataEditButton"
          />
        </EuiToolTip>
      ),
    },
  ];

  return (
    <>
      <EuiPanel>
        <EuiTitle size="s">
          <h3>{definition.name}</h3>
        </EuiTitle>
        <EuiText size="xs" color="subdued">
          {definition.type} · {definition.indexPattern}
        </EuiText>
        <EuiSpacer size="m" />

        <SearchBar
          appName="entities_runtime_caue"
          indexPatterns={dataView ? [dataView] : []}
          query={kqlQuery}
          onQueryChange={({ query }) => {
            if (query) setKqlQuery(query as Query);
          }}
          onQuerySubmit={handleKqlSubmit}
          showDatePicker={false}
          showFilterBar={false}
          disableSubscribingToGlobalDataServices
          dataTestSubj={`entitiesRuntimeKqlBar-${definition.id}`}
        />

        {metadataFields.length > 0 && (
          <>
            <EuiSpacer size="s" />
            <MetadataFilterBar fields={metadataFields} onChange={setMetadataFilters} />
          </>
        )}

        <EuiSpacer size="m" />

        {isLoading ? (
          <EuiLoadingSpinner />
        ) : error ? (
          <EuiText color="danger">
            {i18n.translate('xpack.entitiesRuntimeCaue.entities.error', {
              defaultMessage: 'Failed to discover entities',
            })}
          </EuiText>
        ) : (
          <EuiBasicTable
            items={entities}
            columns={columns}
            tableCaption={`Entities for ${definition.name}`}
          />
        )}
      </EuiPanel>

      {editingEntityId && (
        <EntityMetadataFlyout
          http={http}
          definitionId={definition.id}
          entityId={editingEntityId}
          onClose={() => setEditingEntityId(null)}
        />
      )}
    </>
  );
};

interface Props {
  http: HttpStart;
  dataViews: DataPublicPluginStart['dataViews'];
  SearchBar: UnifiedSearchPublicPluginStart['ui']['SearchBar'];
}

export const EntitiesTab = ({ http, dataViews, SearchBar }: Props) => {
  const { data: definitions = [] } = useDefinitions(http);

  // Use absolute ISO timestamps so the server can pass them directly to ES|QL
  // (ES|QL does not accept Kibana relative strings like "now-24h")
  const [start, setStart] = useState(() =>
    new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()
  );
  const [end, setEnd] = useState(() => new Date().toISOString());

  const handleRefresh = useCallback(() => {
    setStart(new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString());
    setEnd(new Date().toISOString());
  }, []);

  return (
    <EuiPageTemplate.Section>
      <EuiFlexGroup justifyContent="flexEnd" style={{ marginBottom: 16 }}>
        <EuiFlexItem grow={false}>
          <EuiButton
            iconType="refresh"
            onClick={handleRefresh}
            data-test-subj="entitiesRuntimeRefresh"
          >
            {i18n.translate('xpack.entitiesRuntimeCaue.entities.refresh', {
              defaultMessage: 'Refresh',
            })}
          </EuiButton>
        </EuiFlexItem>
      </EuiFlexGroup>
      {definitions.length === 0 ? (
        <EuiText>
          {i18n.translate('xpack.entitiesRuntimeCaue.entities.noDefinitions', {
            defaultMessage: 'No definitions yet. Create one in the Definitions tab.',
          })}
        </EuiText>
      ) : (
        definitions.map((def) => (
          <React.Fragment key={def.id}>
            <DefinitionPanel
              http={http}
              definition={def}
              start={start}
              end={end}
              dataViews={dataViews}
              SearchBar={SearchBar}
            />
            <EuiSpacer size="m" />
          </React.Fragment>
        ))
      )}
    </EuiPageTemplate.Section>
  );
};
