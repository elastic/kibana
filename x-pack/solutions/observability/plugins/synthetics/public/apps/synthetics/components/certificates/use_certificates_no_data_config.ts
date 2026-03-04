/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import { useKibana } from '@kbn/kibana-react-plugin/public';
import type { NoDataConfig } from '@kbn/shared-ux-page-kibana-template';
import type { ClientPluginsStart } from '../../../../plugin';
import { PLUGIN } from '../../../../../common/constants/plugin';
import { MONITOR_ADD_ROUTE } from '../../../../../common/constants';

export const useCertificatesNoDataConfig = (): NoDataConfig => {
  const {
    services: { application, docLinks },
  } = useKibana<ClientPluginsStart>();

  const addMonitorUrl =
    application.getUrlForApp(PLUGIN.SYNTHETICS_PLUGIN_ID, { path: MONITOR_ADD_ROUTE }) ?? '#';

  return {
    action: {
      elasticAgent: {
        title: i18n.translate('xpack.synthetics.certificates.noDataConfig.title', {
          defaultMessage: 'Add a monitor to view TLS certificates',
        }),
        description: i18n.translate('xpack.synthetics.certificates.noDataConfig.description', {
          defaultMessage:
            'Monitors that use HTTPS will report the TLS certificates used by your endpoints. Create a monitor to start collecting certificate data.',
        }),
        href: addMonitorUrl,
        buttonText: i18n.translate('xpack.synthetics.certificates.noDataConfig.buttonText', {
          defaultMessage: 'Create monitor',
        }),
        docsLink: docLinks?.links?.observability?.guide ?? 'https://www.elastic.co/guide/en/observability/current/monitor-uptime-synthetics.html',
      },
    },
  };
};
