/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useEffect, useState } from 'react';
import ReactDOM from 'react-dom';
import type { HtmlPortalNode } from 'react-reverse-portal';
import { createHtmlPortalNode, InPortal, OutPortal } from 'react-reverse-portal';
import type { CommentServiceActions } from '@kbn/elastic-assistant-shared-state';
import { useKibana } from '../../common/lib/kibana';
import { CommentActions } from '.';

interface PortalInfo {
  args: Parameters<CommentServiceActions['mount']>[0];
  portalNode: HtmlPortalNode;
  target: HTMLElement;
}

export const CommentActionsPortal = () => {
  const { elasticAssistantSharedState } = useKibana().services;
  const [portals, setPortals] = useState<Record<string, PortalInfo>>({});

  useEffect(() => {
    const unmountActions = elasticAssistantSharedState.comments.registerActions({
      mount: (args) => (target: HTMLElement) => {
        const portalId = args.message.timestamp + args.message.content;
        const portalNode = createHtmlPortalNode();

        setPortals((prev) => ({
          ...prev,
          [portalId]: { args, portalNode, target },
        }));

        return () => {
          portalNode.unmount();
          setPortals((prev) => {
            const next = { ...prev };
            delete next[portalId];
            return next;
          });
        };
      },
    });

    return () => {
      unmountActions();
    };
  }, [elasticAssistantSharedState.comments]);

  return (
    <>
      {/* InPortal: render the actual UI */}
      {Object.entries(portals).map(([portalId, { args, portalNode }]) => (
        <InPortal key={portalId} node={portalNode}>
          <CommentActions message={args.message} />
        </InPortal>
      ))}

      {/* OutPortal: mount in external DOM targets via createPortal */}
      {Object.entries(portals).map(([portalId, { portalNode, target }]) =>
        target
          ? ReactDOM.createPortal(<OutPortal node={portalNode} key={portalId} />, target)
          : null
      )}
    </>
  );
};
