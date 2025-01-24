/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { i18n } from '@kbn/i18n';
import { isWiredStreamGetResponse } from '@kbn/streams-schema';
import React from 'react';
import { useKibana } from '../../hooks/use_kibana';
import { useStreamsAppFetch } from '../../hooks/use_streams_app_fetch';
import { useStreamsAppParams } from '../../hooks/use_streams_app_params';
import { EntityDetailViewWithoutParams, EntityViewTab } from '../entity_detail_view';
import { StreamDetailDashboardsView } from '../stream_detail_dashboards_view';
import { StreamDetailManagement } from '../stream_detail_management';
import { StreamDetailOverview } from '../stream_detail_overview';

export function StreamDetailView() {
  const params1 = useStreamsAppParams('/{key}/{tab}', true);

  const params2 = useStreamsAppParams('/{key}/management/{subtab}', true);

  const key = params1?.path?.key || params2.path.key;
  const tab = params1?.path?.tab || 'management';

  const {
    dependencies: {
      start: {
        streams: { streamsRepositoryClient },
      },
    },
  } = useKibana();

  const {
    value: streamEntity,
    refresh,
    loading,
  } = useStreamsAppFetch(
    ({ signal }) => {
      return streamsRepositoryClient
        .fetch('GET /api/streams/{id}', {
          signal,
          params: {
            path: {
              id: key,
            },
          },
        })
        .then((response) => {
          if (isWiredStreamGetResponse(response)) {
            return {
              dashboards: response.dashboards,
              inherited_fields: response.inherited_fields,
              elasticsearch_assets: [],
              lifecycle: response.lifecycle,
              name: key,
              stream: {
                name: key,
                ...response.stream,
              },
            };
          }

          return {
            dashboards: response.dashboards,
            elasticsearch_assets: response.elasticsearch_assets,
            inherited_fields: {},
            lifecycle: response.lifecycle,
            name: key,
            stream: {
              name: key,
              ...response.stream,
            },
          };
        });
    },
    [streamsRepositoryClient, key]
  );

  const entity = {
    id: key,
    displayName: key,
  };

  const tabs: EntityViewTab[] = [
    {
      name: 'overview',
      content: <StreamDetailOverview definition={streamEntity} />,
      label: i18n.translate('xpack.streams.streamDetailView.overviewTab', {
        defaultMessage: 'Overview',
      }),
    },
    {
      name: 'dashboards',
      content: <StreamDetailDashboardsView definition={streamEntity} />,
      label: i18n.translate('xpack.streams.streamDetailView.dashboardsTab', {
        defaultMessage: 'Dashboards',
      }),
    },
    {
      name: 'management',
      content: (
        <StreamDetailManagement
          definition={streamEntity}
          refreshDefinition={refresh}
          isLoadingDefinition={loading}
        />
      ),
      label: i18n.translate('xpack.streams.streamDetailView.managementTab', {
        defaultMessage: 'Management',
      }),
    },
  ];

  return (
    <EntityDetailViewWithoutParams
      tabs={tabs}
      entity={entity}
      definition={streamEntity}
      selectedTab={tab}
    />
  );
}
