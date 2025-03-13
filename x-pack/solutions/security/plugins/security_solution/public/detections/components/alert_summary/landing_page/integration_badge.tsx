/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { memo, useCallback, useMemo } from 'react';
import { css } from '@emotion/react';
import { EuiBadge, EuiCard } from '@elastic/eui';
import type { PackageListItem } from '@kbn/fleet-plugin/common';
import { INTEGRATIONS_PLUGIN_ID } from '@kbn/fleet-plugin/common';
import { CardIcon, useLink } from '@kbn/fleet-plugin/public';
import { useKibana } from '../../../../common/lib/kibana';
import { SIEM_BADGE } from './translations';

const MIN_WIDTH = 275; // px
const INTEGRATIONS_BASE_PATH = '/app/integrations';

export interface IntegrationProps {
  /**
   *
   */
  integration: PackageListItem;
}

/**
 *
 */
export const IntegrationBadge = memo(({ integration }: IntegrationProps) => {
  const {
    services: { application },
  } = useKibana();
  const { getHref } = useLink();

  const icons = useMemo(
    () => (!integration.icons || !integration.icons.length ? [] : integration.icons),
    [integration]
  );

  const onClick = useCallback(() => {
    const url = getHref('integration_details_overview', {
      pkgkey: `${integration.name}-${integration.version}`,
      ...(integration.integration ? { integration: integration.integration } : {}),
    });

    console.log('url', url);
    if (url.startsWith(INTEGRATIONS_BASE_PATH)) {
      application.navigateToApp(INTEGRATIONS_PLUGIN_ID, {
        path: url.slice(INTEGRATIONS_BASE_PATH.length),
      });
    } else if (url.startsWith('http') || url.startsWith('https')) {
      window.open(url, '_blank');
    } else {
      application.navigateToUrl(url);
    }
  }, [application, getHref, integration.integration, integration.name, integration.version]);

  return (
    <EuiCard
      css={css`
        min-width: ${MIN_WIDTH}px;
      `}
      description={<EuiBadge color="hollow">{SIEM_BADGE}</EuiBadge>}
      display="plain"
      hasBorder
      icon={
        <CardIcon
          icons={icons}
          integrationName={integration.title}
          packageName={integration.name}
          size="xl"
          version={integration.version}
        />
      }
      layout="horizontal"
      onClick={onClick}
      titleSize="xs"
      title={integration.title}
    />
  );
});

IntegrationBadge.displayName = 'IntegrationBadge';
