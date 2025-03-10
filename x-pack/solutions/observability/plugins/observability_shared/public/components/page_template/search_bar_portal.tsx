/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { ReactNode, useEffect, useMemo } from 'react';
import ReactDOM from 'react-dom';
import { EuiPanel, EuiSpacer } from '@elastic/eui';
import { createHtmlPortalNode, InPortal, OutPortal } from 'react-reverse-portal';
export interface Props {
  children: ReactNode;
}

export function SearchBarPortal({ children }: Props) {
  const portalNode = useMemo(() => createHtmlPortalNode(), []);

  useEffect(() => {
    setTimeout(() => {
      const mainContent = globalThis.document.querySelector('main');
      if (!mainContent) return;
      const element = document.createElement('div');
      element.setAttribute('id', 'searchBarContainer');
      ReactDOM.render(<OutPortal node={portalNode} />, element);
      if (mainContent.childNodes?.[0]) {
        mainContent.insertBefore(element, mainContent.childNodes?.[0]);
      }
    }, 10);

    return () => {
      portalNode.unmount();
    };
  }, [portalNode]);

  return (
    <InPortal node={portalNode}>
      <EuiPanel hasShadow={false} borderRadius="none" hasBorder={true} color="subdued">
        <EuiSpacer size="s" />
        {children}
      </EuiPanel>
    </InPortal>
  );
}
