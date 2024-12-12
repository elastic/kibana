/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React from 'react';
import { i18n } from '@kbn/i18n';
import { ReadStreamDefinition } from '@kbn/streams-plugin/common';
import { useStreamsAppParams } from '../../hooks/use_streams_app_params';
import { RedirectTo } from '../redirect_to';
import { StreamDetailRouting } from '../stream_detail_routing';
import { StreamDetailEnriching } from '../stream_detail_enriching';
import { StreamDetailSchemaEditor } from '../stream_detail_schema_editor';
import { Wrapper } from './wrapper';

type ManagementSubTabs = 'route' | 'enrich' | 'schemaEditor';

function isValidManagementSubTab(value: string): value is ManagementSubTabs {
  return ['route', 'enrich', 'schemaEditor'].includes(value);
}

export function WiredStreamDetailManagement({
  definition,
  refreshDefinition,
}: {
  definition?: ReadStreamDefinition;
  refreshDefinition: () => void;
}) {
  const {
    path: { key, subtab },
  } = useStreamsAppParams('/{key}/management/{subtab}');

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
        <StreamDetailEnriching definition={definition} refreshDefinition={refreshDefinition} />
      ),
      label: i18n.translate('xpack.streams.streamDetailView.enrichingTab', {
        defaultMessage: 'Extract field',
      }),
    },
    schemaEditor: {
      content: (
        <StreamDetailSchemaEditor definition={definition} refreshDefinition={refreshDefinition} />
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
