/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { memo, useCallback, useMemo } from 'react';
import { css } from '@emotion/react';
import { EuiBadge, EuiCard, useEuiTheme } from '@elastic/eui';
import type { PackageListItem } from '@kbn/fleet-plugin/common';
import { INTEGRATIONS_PLUGIN_ID } from '@kbn/fleet-plugin/common';
import { useLink } from '@kbn/fleet-plugin/public';
import { i18n } from '@kbn/i18n';
import { IntegrationIcon } from '../common/integration_icon';
import { useKibana } from '../../../../common/lib/kibana';

const SIEM_BADGE = i18n.translate('xpack.securitySolution.alertSummary.integrations.siemBadge', {
  defaultMessage: 'SIEM',
});

const MIN_WIDTH = 275; // px
const INTEGRATIONS_BASE_PATH = '/app/integrations';
const INTEGRATION_DETAILS_PAGE = 'integration_details_overview';

export interface IntegrationCardProps {
  /**
   * AI for SOC integration available to install
   */
  integration: PackageListItem;
  /**
   * Data test subject string for testing
   */
  ['data-test-subj']?: string;
}

/**
 * Rendered on the alert summary landing page, when no integrations have been installed.
 * The card is clickable and will navigate the user to the integration's details page.
 */
export const IntegrationCard = memo(
  ({ integration, 'data-test-subj': dataTestSubj }: IntegrationCardProps) => {
    const { euiTheme } = useEuiTheme();
    const iconStyle = useMemo(() => ({ marginInlineEnd: euiTheme.size.base }), [euiTheme]);

    const {
      services: { application },
    } = useKibana();
    const { getHref } = useLink();

    const onClick = useCallback(() => {
      const url = getHref(INTEGRATION_DETAILS_PAGE, {
        pkgkey: `${integration.name}-${integration.version}`,
        ...(integration.integration ? { integration: integration.integration } : {}),
      });

      application.navigateToApp(INTEGRATIONS_PLUGIN_ID, {
        path: url.slice(INTEGRATIONS_BASE_PATH.length),
      });
    }, [application, getHref, integration.integration, integration.name, integration.version]);

    return (
      <EuiCard
        css={css`
          min-width: ${MIN_WIDTH}px;
        `}
        data-test-subj={dataTestSubj}
        description={<EuiBadge color="hollow">{SIEM_BADGE}</EuiBadge>}
        display="plain"
        hasBorder
        icon={
          <div style={iconStyle}>
            <IntegrationIcon
              data-test-subj={dataTestSubj}
              iconSize="xl"
              integration={integration}
            />
          </div>
        }
        layout="horizontal"
        onClick={onClick}
        titleSize="xs"
        title={integration.title}
      />
    );
  }
);

IntegrationCard.displayName = 'IntegrationCard';
