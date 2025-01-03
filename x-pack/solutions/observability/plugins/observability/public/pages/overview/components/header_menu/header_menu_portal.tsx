/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { ReactNode, useEffect, useMemo } from 'react';
import { createHtmlPortalNode, InPortal, OutPortal } from 'react-reverse-portal';
import { toMountPoint } from '@kbn/react-kibana-mount';
import {
  AppMountParameters,
  I18nStart,
  ThemeServiceStart,
  UserProfileService,
} from '@kbn/core/public';

export interface HeaderMenuPortalProps {
  children: ReactNode;
  setHeaderActionMenu: AppMountParameters['setHeaderActionMenu'];
  i18n: I18nStart;
  theme: ThemeServiceStart;
  userProfile: UserProfileService;
}

// eslint-disable-next-line import/no-default-export
export default function HeaderMenuPortal({
  children,
  setHeaderActionMenu,
  i18n,
  theme,
  userProfile,
}: HeaderMenuPortalProps) {
  const portalNode = useMemo(() => createHtmlPortalNode(), []);

  useEffect(() => {
    setHeaderActionMenu((element) => {
      const mount = toMountPoint(<OutPortal node={portalNode} />, {
        ...{ theme, i18n, userProfile },
      });
      return mount(element);
    });

    return () => {
      portalNode.unmount();
      setHeaderActionMenu(undefined);
    };
  }, [portalNode, setHeaderActionMenu, i18n, theme, userProfile]);

  return <InPortal node={portalNode}>{children}</InPortal>;
}
