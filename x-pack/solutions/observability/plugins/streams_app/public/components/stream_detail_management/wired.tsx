/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React, { useMemo } from 'react';
import { i18n } from '@kbn/i18n';
import { WiredStreamGetResponse } from '@kbn/streams-schema';
import { useStreamsAppParams } from '../../hooks/use_streams_app_params';
import { RedirectTo } from '../redirect_to';
import { StreamDetailRouting } from '../stream_detail_routing';
import { StreamDetailEnrichment } from '../stream_detail_enrichment';
import { StreamDetailSchemaEditor } from '../stream_detail_schema_editor';
import { Wrapper } from './wrapper';

type ManagementSubTabs = 'route' | 'enrich' | 'schemaEditor';

function isValidManagementSubTab(value: string): value is ManagementSubTabs {
  return ['route', 'enrich', 'schemaEditor'].includes(value);
}

export function WiredStreamDetailManagement({
  definition,
  refreshDefinition,
  isLoadingDefinition,
}: {
  definition?: WiredStreamGetResponse;
  refreshDefinition: () => void;
  isLoadingDefinition: boolean;
}) {
  const {
    path: { key, subtab },
  } = useStreamsAppParams('/{key}/management/{subtab}');

  const legacyDefinition = useMemo(() => {
    if (!definition) {
      return undefined;
    }
    return {
      dashboards: definition.dashboards,
      inherited_fields: definition.inherited_fields,
      elasticsearch_assets: [],
      effective_lifecycle: definition.effective_lifecycle,
      name: definition.stream.name,
      stream: {
        ...definition.stream,
      },
    };
  }, [definition]);

  const tabs = {
    route: {
      content: (
        <StreamDetailRouting definition={definition} refreshDefinition={refreshDefinition} />
      ),
      label: i18n.translate('xpack.streams.streamDetailView.routingTab', {
        defaultMessage: 'Streams Partitioning',
      }),
    },
    enrich: {
      content: (
        <StreamDetailEnrichment
          definition={legacyDefinition}
          refreshDefinition={refreshDefinition}
        />
      ),
      label: i18n.translate('xpack.streams.streamDetailView.enrichmentTab', {
        defaultMessage: 'Extract field',
      }),
    },
    schemaEditor: {
      content: (
        <StreamDetailSchemaEditor
          definition={definition}
          refreshDefinition={refreshDefinition}
          isLoadingDefinition={isLoadingDefinition}
        />
      ),
      label: i18n.translate('xpack.streams.streamDetailView.schemaEditorTab', {
        defaultMessage: 'Schema editor',
      }),
    },
  };

  if (!isValidManagementSubTab(subtab)) {
    return (
      <RedirectTo path="/{key}/management/{subtab}" params={{ path: { key, subtab: 'route' } }} />
    );
  }

  return <Wrapper tabs={tabs} streamId={key} subtab={subtab} />;
}
