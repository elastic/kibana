/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { i18n } from '@kbn/i18n';
import type { CaseAttachmentWithoutOwner } from '@kbn/cases-plugin/common';
import { type SuggestionContext, type SuggestionHandlerResponse } from '@kbn/cases-plugin/common';
import type { SuggestionType } from '@kbn/cases-plugin/server';
import type { CoreStart, KibanaRequest, Logger } from '@kbn/core/server';
import type { AttachmentItem } from '@kbn/cases-plugin/common/types/domain/suggestion/v1';
import type { LocatorClient } from '@kbn/share-plugin/common/url_service';
import { syntheticsMonitorDetailLocatorID } from '@kbn/observability-plugin/common';
import { syntheticsMonitorSavedObjectType } from '../../common/types/saved_objects';
import type {
  EncryptedSyntheticsMonitorAttributes,
  OverviewStatusMetaData,
} from '../../common/runtime_types';
import type { SyntheticsSuggestion } from '../../common/types';
import type { SyntheticsAggregationsResponse } from './types';

export function getMonitorByServiceName(
  coreStart: CoreStart,
  logger: Logger,
  locatorClient?: LocatorClient
): SuggestionType<SyntheticsSuggestion> {
  return {
    id: 'syntheticMonitorByServiceName',
    attachmentTypeId: '.page',
    owner: 'observability',
    handlers: {
      syntheticMonitorByServiceName: {
        tool: {
          description: 'Suggest Synthetic monitors operating on the same service.',
        },
        handler: async ({
          context: { 'service.name': serviceNames, spaceId },
          request,
        }: {
          context: SuggestionContext;
          request: KibanaRequest;
        }): Promise<SuggestionHandlerResponse<SyntheticsSuggestion>> => {
          const scopedSavedObjectsClient = coreStart.savedObjects.getScopedClient(request);

          if (!serviceNames || !serviceNames.length) {
            return { suggestions: [] };
          }
          const scopedClusterClient = coreStart.elasticsearch.client.asScoped(request);
          const locator = locatorClient?.get(syntheticsMonitorDetailLocatorID);
          const results = await scopedClusterClient.asCurrentUser.search({
            index: 'synthetics-*',
            query: {
              bool: {
                filter: [
                  {
                    terms: {
                      'service.name': serviceNames,
                    },
                  },
                  {
                    terms: {
                      'meta.space_id': [spaceId],
                    },
                  },
                ],
              },
            },
            aggs: {
              by_monitor: {
                terms: {
                  field: 'observer.name',
                  // TODO: TBD
                  // it limits suggestions to the top 5 monitors
                  size: 5,
                },
                aggs: {
                  latest_run: {
                    top_hits: {
                      sort: [
                        {
                          '@timestamp': {
                            order: 'desc',
                          },
                        },
                      ],
                      size: 1,
                      _source: {
                        includes: [
                          'monitor.name',
                          'monitor.type',
                          'monitor.status',
                          'status',
                          'observer.geo.name',
                          'observer.name',
                          'service.name',
                          'monitor.id',
                          'config_id',
                          'url.full',
                          '@timestamp',
                          'meta.space_id',
                          'type',
                        ],
                      },
                    },
                  },
                },
              },
            },
          });

          const monitors = (results.aggregations as SyntheticsAggregationsResponse['aggregations'])
            .by_monitor.buckets;

          if (monitors.length === 0) {
            logger.debug(`No Synthetics monitors found for service ${serviceNames.join(', ')}`);
            return { suggestions: [] };
          }

          const savedObjectsAttrHash: Record<string, EncryptedSyntheticsMonitorAttributes> = {};
          const bulkGetRequests: Array<{ id: string; type: string }> = [];

          for (const mon of monitors) {
            bulkGetRequests.push({
              id: mon.latest_run.hits.hits[0]._source.config_id,
              type: syntheticsMonitorSavedObjectType,
            });
          }

          const monitorsSavedObject = await scopedSavedObjectsClient.bulkGet<{
            monitor: Record<string, any>;
          }>(bulkGetRequests);

          if (bulkGetRequests.length === 0) {
            logger.debug(`No Synthetics SavedObjects found for the related tests runs`);
            return { suggestions: [] };
          }

          for (const savedObj of monitorsSavedObject.saved_objects) {
            if (!savedObj.error && savedObj.id) {
              savedObjectsAttrHash[savedObj.id] =
                savedObj.attributes as unknown as EncryptedSyntheticsMonitorAttributes;
            }
          }

          const monitorsOverviewMetaData: Array<
            OverviewStatusMetaData & { service: { name: string } }
          > = monitors.map((monitor) => {
            const source = monitor.latest_run.hits.hits[0]._source;
            const relatedSavedObjectAttr: EncryptedSyntheticsMonitorAttributes =
              savedObjectsAttrHash[source.config_id];
            return {
              monitorQueryId: source.monitor.id,
              configId: source.config_id,
              service: { name: source.service.name },
              status: source.monitor.status ?? 'unknown',
              name: source.monitor.name,
              isEnabled: relatedSavedObjectAttr.enabled,
              isStatusAlertEnabled: relatedSavedObjectAttr.alert?.status?.enabled ?? false,
              type: source.monitor.type,
              schedule: relatedSavedObjectAttr.schedule.number,
              tags: relatedSavedObjectAttr.tags ?? [],
              maintenanceWindows: relatedSavedObjectAttr.maintenance_windows ?? [],
              timestamp: source['@timestamp'],
              spaces: source.meta.space_id,
              locationLabel: source.observer.geo.name,
              locationId: source.observer.name,
              urls: source.url.full,
              projectId: relatedSavedObjectAttr.project_id,
            };
          });

          const suggestions = monitorsOverviewMetaData.map((monitor) => {
            const url = locator?.getRedirectUrl({
              configId: monitor.configId,
              locationId: monitor.locationId,
              spaceId: monitor.spaces ?? [],
            });
            const item: AttachmentItem<SyntheticsSuggestion> = {
              description: `Synthetic ${monitor.name} is ${monitor.status} for the service: ${monitor.service.name} `,
              payload: monitor,
              attachment: {
                type: 'persistableState' as Extract<
                  CaseAttachmentWithoutOwner['type'],
                  'persistableState'
                >,
                persistableStateAttachmentTypeId: '.page',
                persistableStateAttachmentState: {
                  type: 'synthetics_history',
                  url: {
                    pathAndQuery: url ?? '#',
                    label: monitor.name,
                    actionLabel: i18n.translate('xpack.synthetics.addToCase.caseAttachmentLabel', {
                      defaultMessage: 'Go to Synthetics monitor overview of {monitorName}',
                      values: { monitorName: monitor.name },
                    }),
                    iconType: 'metricbeatApp',
                  },
                },
              },
            };
            return {
              id: `synthetics-monitors-suggestion-${monitor.monitorQueryId}-${monitor.locationId}-${monitor.service.name}`,
              componentId: 'synthetics',
              description: i18n.translate('xpack.synthetics.addToCase.caseAttachmentDescription', {
                defaultMessage:
                  'The synthetics monitor {monitorName} might be related to this case with service {serviceName}',
                values: { monitorName: monitor.name, serviceName: monitor.service.name },
              }),
              data: [item],
            };
          });
          return { suggestions };
        },
      },
    },
  };
}
