/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { ReactNode, useEffect, useMemo } from 'react';
import { createHtmlPortalNode, InPortal, OutPortal } from 'react-reverse-portal';
import { toMountPoint } from '@kbn/react-kibana-mount';
import { AppMountParameters } from '@kbn/core/public';
import { useKibana } from '../../../../utils/kibana_react';
export interface HeaderMenuPortalProps {
  children: ReactNode;
  setHeaderActionMenu: AppMountParameters['setHeaderActionMenu'];
  theme$: AppMountParameters['theme$'];
}

// eslint-disable-next-line import/no-default-export
export default function HeaderMenuPortal({
  children,
  setHeaderActionMenu,
  theme$,
}: HeaderMenuPortalProps) {
  const { i18n } = useKibana().services;
  const portalNode = useMemo(() => createHtmlPortalNode(), []);

  useEffect(() => {
    setHeaderActionMenu((element) => {
      const mount = toMountPoint(<OutPortal node={portalNode} />, {
        ...{ theme: { theme$ }, i18n },
      });
      return mount(element);
    });

    return () => {
      portalNode.unmount();
      setHeaderActionMenu(undefined);
    };
  }, [portalNode, setHeaderActionMenu, i18n, theme$]);

  return <InPortal node={portalNode}>{children}</InPortal>;
}
