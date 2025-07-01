/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { memo, useMemo } from 'react';
import { useKibana } from '../../../../common/lib/kibana';
import {
  MissingPrivilegesDescription,
  MissingPrivilegesTooltip,
} from '../../../../common/missing_privileges';
import type { CapabilitiesLevel } from '../../service/capabilities';

export const WithMissingPrivilegesTooltip = <P extends { isAuthorized: boolean }>(
  Component: React.ComponentType<P>,
  level: CapabilitiesLevel
) => {
  const WrappedComponent = memo(function WrappedComponent(props: Omit<P, 'isAuthorized'>) {
    const {
      services: { siemMigrations },
    } = useKibana();

    const missingCapabilities = useMemo(
      () => siemMigrations.rules.getMissingCapabilities(level),
      [siemMigrations.rules]
    );

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
