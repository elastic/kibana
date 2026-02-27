/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { i18n } from '@kbn/i18n';
import { EuiText, EuiLink } from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n-react';
import { Popover } from '../tabs/common/popover';
import { useAssetDetailsRenderPropsContext } from '../hooks/use_asset_details_render_props';

const DOCUMENTATION_LINK =
  'https://www.elastic.co/guide/en/observability/current/view-infrastructure-metrics.html';
const SYSTEM_INTEGRATION_DOCS_LINK = 'https://ela.st/hosts-ui-systems-integration';
const SEMCONV_INTEGRATION_DOCS_LINK = 'https://ela.st/otel-process-hosts-ui';

export const TopProcessesTooltip = React.memo(() => {
  const { schema } = useAssetDetailsRenderPropsContext();

  return (
    <Popover
      aria-label={i18n.translate('xpack.infra.metrics.nodeDetails.processesHeader.tooltipLabel', {
        defaultMessage: 'More info',
      })}
      iconSize="m"
      icon="info"
      data-test-subj="infraAssetDetailsProcessesPopoverButton"
    >
      <EuiText size="xs" style={{ width: 300 }}>
        <p>
          <FormattedMessage
            id="xpack.infra.assetDetails.processes.tooltip.topProcesses"
            defaultMessage="The processes listed are based on an aggregation of the top CPU and the top memory consuming processes. It does not show all processes."
          />
        </p>
        {schema === 'ecs' ? (
          <p>
            <FormattedMessage
              id="xpack.infra.assetDetails.processes.tooltip.ecsLabel"
              defaultMessage="You can configure the {systemIntegration} to emit process data for your hosts."
              values={{
                systemIntegration: (
                  <EuiLink
                    data-test-subj="infraAssetDetailsTooltipECSIntegrationDocumentationLink"
                    href={SYSTEM_INTEGRATION_DOCS_LINK}
                    target="_blank"
                  >
                    <FormattedMessage
                      id="xpack.infra.assetDetails.processes.tooltip.ecsIntegrationDocumentationLink"
                      defaultMessage="System Integration"
                    />
                  </EuiLink>
                ),
              }}
            />
          </p>
        ) : (
          <p>
            <FormattedMessage
              id="xpack.infra.assetDetails.processes.tooltip.semconvLabel"
              defaultMessage="You can {configureOpenTelemetryCollector} to emit process data for your hosts."
              values={{
                configureOpenTelemetryCollector: (
                  <EuiLink
                    data-test-subj="infraAssetDetailsTooltipSemconvIntegrationDocumentationLink"
                    href={SEMCONV_INTEGRATION_DOCS_LINK}
                    target="_blank"
                  >
                    <FormattedMessage
                      id="xpack.infra.assetDetails.processes.tooltip.semconvIntegrationDocumentationLink"
                      defaultMessage="configure your OpenTelemetry Collector"
                    />
                  </EuiLink>
                ),
              }}
            />
          </p>
        )}
        <p>
          <FormattedMessage
            id="xpack.infra.assetDetails.processes.tooltip.documentationLabel"
            defaultMessage="Please see our {documentation} for more details on processes."
            values={{
              documentation: (
                <EuiLink
                  data-test-subj="infraAssetDetailsTooltipDocumentationLink"
                  href={DOCUMENTATION_LINK}
                  target="_blank"
                >
                  <FormattedMessage
                    id="xpack.infra.assetDetails.processes.tooltip.documentationLink"
                    defaultMessage="documentation"
                  />
                </EuiLink>
              ),
            }}
          />
        </p>
      </EuiText>
    </Popover>
  );
});
