/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useEffect, useState } from 'react';
import type { DataTableRecord } from '@kbn/discover-utils';
import { OverviewTab } from '../../flyout_v2/document/tabs/overview_tab';
import type { StartServices } from '../../types';
import { flyoutProviders } from '../../flyout_v2/shared/components/flyout_provider';

export interface AlertFlyoutOverviewTabProps {
  /**
   * The document record that will be used to render the content of the overview tab in the alert details flyout.
   */
  hit: DataTableRecord;
  /**
   * A promise that resolves to the services required to render the content of the overview tab in the alert details flyout.
   */
  servicesPromise: Promise<StartServices>;
}

export const AlertFlyoutOverviewTab = ({ hit, servicesPromise }: AlertFlyoutOverviewTabProps) => {
  const [services, setServices] = useState<StartServices | null>(null);

  useEffect(() => {
    let isCanceled = false;

    servicesPromise
      .then((resolvedServices) => {
        if (!isCanceled) {
          setServices(resolvedServices);
        }
      })
      .catch(() => {
        if (!isCanceled) {
          setServices(null);
        }
      });

    return () => {
      isCanceled = true;
    };
  }, [servicesPromise]);

  if (!services) {
    return null;
  }

  return flyoutProviders({
    services,
    children: <OverviewTab hit={hit} />,
  });
};
