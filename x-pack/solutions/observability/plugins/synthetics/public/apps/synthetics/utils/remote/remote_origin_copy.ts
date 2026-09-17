/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import { kibanaService } from '../../../../utils/kibana_service';

/**
 * Serverless remotes are CPS linked projects (`_index` prefix = project
 * alias). Stateful remotes are CCS clusters. Copy must not call a project
 * a "cluster".
 */
export const isLinkedProjectOrigin = (): boolean => Boolean(kibanaService.isServerless);

export const getRemoteMonitorCalloutTitle = (): string =>
  isLinkedProjectOrigin()
    ? i18n.translate('xpack.synthetics.monitorDetails.linkedProjectCallout.title', {
        defaultMessage: 'Linked project monitor',
      })
    : i18n.translate('xpack.synthetics.monitorDetails.remoteCallout.title', {
        defaultMessage: 'Remote monitor',
      });

export const getViewOnRemoteOriginButtonLabel = (): string =>
  isLinkedProjectOrigin()
    ? i18n.translate(
        'xpack.synthetics.monitorDetails.linkedProjectCallout.viewOnLinkedProjectButtonLabel',
        { defaultMessage: 'View on linked project' }
      )
    : i18n.translate('xpack.synthetics.monitorDetails.remoteCallout.viewOnRemoteCluster', {
        defaultMessage: 'View on remote cluster',
      });

export const getRemoteBadgeLabel = (): string =>
  isLinkedProjectOrigin()
    ? i18n.translate('xpack.synthetics.linkedProjectBadge.label', {
        defaultMessage: 'Linked',
      })
    : i18n.translate('xpack.synthetics.remoteBadge.label', {
        defaultMessage: 'Remote',
      });

export const getRemoteOriginFieldLabel = (): string =>
  isLinkedProjectOrigin()
    ? i18n.translate('xpack.synthetics.remoteOrigin.linkedProjectLabel', {
        defaultMessage: 'Linked project',
      })
    : i18n.translate('xpack.synthetics.remoteOrigin.remoteClusterLabel', {
        defaultMessage: 'Remote cluster',
      });

export const getLoadedFromRemoteOriginTooltip = (remoteName: string): string =>
  isLinkedProjectOrigin()
    ? i18n.translate('xpack.synthetics.certs.monitors.linkedProjectTooltip', {
        defaultMessage: 'Loaded from linked project {remoteName}',
        values: { remoteName },
      })
    : i18n.translate('xpack.synthetics.certs.monitors.remoteClusterTooltip', {
        defaultMessage: 'Loaded from remote cluster {remoteName}',
        values: { remoteName },
      });

export const getRemoteUrlUnavailableTooltip = (): string =>
  isLinkedProjectOrigin()
    ? i18n.translate('xpack.synthetics.monitorList.linkedProjectUrlUnavailableTooltip', {
        defaultMessage:
          'The linked project Kibana URL is not available. Ensure the linked project has server.publicBaseUrl configured.',
      })
    : i18n.translate('xpack.synthetics.monitorList.remoteUrlUnavailableText', {
        defaultMessage:
          'The remote Kibana URL is not available. Ensure the remote cluster has server.publicBaseUrl configured.',
      });
