/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { memo, useMemo } from 'react';
import type { MigrationTaskStats } from '../../../../../common/siem_migrations/model/common.gen';
import {
  MissingPrivilegesDescription,
  MissingPrivilegesTooltip,
} from '../../../../common/components/missing_privileges';
import type { CapabilitiesLevel, SiemMigrationsServiceBase } from '../../service';

export const WithMissingPrivilegesTooltip = <
  P extends { isAuthorized: boolean },
  T extends MigrationTaskStats
>(
  Component: React.ComponentType<P>,
  service: SiemMigrationsServiceBase<T>,
  level: CapabilitiesLevel
) => {
  const WrappedComponent = memo(function WrappedComponent(props: Omit<P, 'isAuthorized'>) {
    const missingCapabilities = useMemo(() => service.getMissingCapabilities(level), []);

    const isAuthorized = useMemo(() => missingCapabilities.length === 0, [missingCapabilities]);

    const finalProps = useMemo(
      () =>
        ({
          ...props,
          isAuthorized,
        } as P),
      [props, isAuthorized]
    );

    if (missingCapabilities.length > 0) {
      return (
        <MissingPrivilegesTooltip
          description={
            <MissingPrivilegesDescription
              privileges={missingCapabilities.map(({ description }) => description)}
            />
          }
        >
          <Component {...finalProps} />
        </MissingPrivilegesTooltip>
      );
    }

    return <Component {...finalProps} />;
  });

  WrappedComponent.displayName = `WithMissingPrivilegesTooltip(${
    Component.displayName || Component.name
  })`;

  return WrappedComponent;
};
