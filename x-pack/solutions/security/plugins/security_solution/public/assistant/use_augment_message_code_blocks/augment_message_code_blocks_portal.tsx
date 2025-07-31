/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useEffect, useState } from 'react';
import type { HtmlPortalNode } from 'react-reverse-portal';
import { InPortal, OutPortal, createHtmlPortalNode } from 'react-reverse-portal';
import ReactDOM from 'react-dom';
import type { Conversation } from '@kbn/elastic-assistant';
import { analyzeMarkdown } from '@kbn/elastic-assistant';
import { replaceAnonymizedValuesWithOriginalValues } from '@kbn/elastic-assistant-common';
import { AugmentMessageCodeBlockButton } from './augment_message_code_block_button';
import { useKibana } from '../../common/lib/kibana';

interface PortalInfo {
  portalId: string;
  node: HtmlPortalNode;
  target: HTMLElement;
  inPortal: React.ReactElement;
}

export const AugmentMessageCodeBlocksPortal = () => {
  const [portals, setPortals] = useState<Record<string, PortalInfo>>({});
  const { elasticAssistantSharedState } = useKibana().services;

  const mountMessageCodeBlocks = ({
    currentConversation,
    showAnonymizedValues,
  }: {
    currentConversation: Conversation;
    showAnonymizedValues: boolean;
  }) => {
    const codeBlockDetails = currentConversation.messages.map(({ content }) =>
      analyzeMarkdown(
        showAnonymizedValues
          ? content ?? ''
          : replaceAnonymizedValuesWithOriginalValues({
              messageContent: content ?? '',
              replacements: currentConversation.replacements,
            })
      )
    );

    const mountingFunctions = codeBlockDetails.flatMap((codeBlocks, messageIndex) =>
      codeBlocks.map((codeBlock, codeBlockIndex) => {
        const mount = () => {
          const controlContainer = document.querySelectorAll(
            `.message-${messageIndex} .euiCodeBlock__controls`
          )[codeBlockIndex] as HTMLElement;

          if (!controlContainer) {
            return () => {};
          }

          const portalId = `code-block-portal-${currentConversation.id}-${messageIndex}-${codeBlockIndex}`;
          const portalNode = createHtmlPortalNode();

          const inPortal = (
            <InPortal key={portalId} node={portalNode}>
              <AugmentMessageCodeBlockButton
                currentConversation={currentConversation}
                codeBlockDetails={codeBlock}
              />
            </InPortal>
          );

          setPortals((prev) => ({
            ...prev,
            [portalId]: {
              portalId,
              node: portalNode,
              target: controlContainer,
              inPortal,
            },
          }));

          return () => {
            portalNode.unmount();
            setPortals((prev) => {
              const next = { ...prev };
              delete next[portalId];
              return next;
            });
          };
        };

        return mount;
      })
    );

    const mountAll = () => {
      const unmounters = mountingFunctions.map((fn) => fn());
      return () => unmounters.forEach((unmount) => unmount());
    };

    return mountAll();
  };

  useEffect(() => {
    const cleanup =
      elasticAssistantSharedState.augmentMessageCodeBlocks.registerAugmentMessageCodeBlocks({
        mount: mountMessageCodeBlocks,
      });

    return () => {
      cleanup();
      setPortals({});
    };
  }, [elasticAssistantSharedState.augmentMessageCodeBlocks]);

  return (
    <>
      {/* InPortals that render the actual UI */}
      {Object.values(portals).map(({ portalId, inPortal }) => (
        <React.Fragment key={portalId}>{inPortal}</React.Fragment>
      ))}

      {/* OutPortals rendered into target elements via createPortal */}
      {Object.values(portals).map(({ portalId, node, target }) =>
        target ? ReactDOM.createPortal(<OutPortal node={node} key={portalId} />, target) : null
      )}
    </>
  );
};
