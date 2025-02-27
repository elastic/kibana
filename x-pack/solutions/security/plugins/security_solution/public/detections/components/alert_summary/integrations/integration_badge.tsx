/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { memo, useMemo } from 'react';
import { EuiCard } from '@elastic/eui';
import type { CustomIntegration } from '@kbn/custom-integrations-plugin/public';
import type { PackageListItem } from '@kbn/fleet-plugin/common';
import { CardIcon } from '@kbn/fleet-plugin/public';
import { LAST_SYNCED } from './translations';
import { FormattedRelativePreferenceDate } from '../../../../common/components/formatted_date';

export interface IntegrationProps {
  /**
   *
   */
  integration: CustomIntegration | PackageListItem;
}

/**
 *
 */
export const IntegrationBadge = memo(({ integration }: IntegrationProps) => {
  const icons = useMemo(
    () => (!integration.icons || !integration.icons.length ? [] : integration.icons),
    [integration]
  );
  const packageName = useMemo(
    () => ('name' in integration ? integration.name : integration.id),
    [integration]
  );
  const integrationName = useMemo(
    () => ('integration' in integration ? integration.integration || '' : ''),
    [integration]
  );
  const version = useMemo(
    () => ('version' in integration ? integration.version || '' : ''),
    [integration]
  );

  return (
    <EuiCard
      layout="horizontal"
      icon={
        <CardIcon
          icons={icons}
          packageName={packageName}
          integrationName={integrationName}
          version={version}
        />
      }
      title={integration.title}
      titleSize="xs"
      description={
        <p>
          {LAST_SYNCED}
          <FormattedRelativePreferenceDate value={new Date().getTime()} />
        </p>
      }
    />
  );
});

IntegrationBadge.displayName = 'IntegrationBadge';
