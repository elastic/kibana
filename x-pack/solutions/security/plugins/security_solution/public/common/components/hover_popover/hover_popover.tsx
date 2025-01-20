/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { PopoverAnchorPosition } from '@elastic/eui';
import { EuiPopover } from '@elastic/eui';
import { IS_DRAGGING_CLASS_NAME } from '@kbn/securitysolution-t-grid';
import type { PropsWithChildren } from 'react';
import React, { useCallback, useEffect, useRef, useState } from 'react';

/**
 * To avoid expensive changes to the DOM, delay showing the popover menu
 */
const HOVER_INTENT_DELAY = 100; // ms

export interface HoverPopoverProps {
  hoverContent: React.ReactNode;
  anchorPosition?: PopoverAnchorPosition;
}

/**
 * Decorates it's children with actions that are visible on hover.
 * This component does not enforce an opinion on the styling and
 * positioning of the hover content, but see the documentation for
 * the `hoverContent` for tips on (not) effecting layout on-hover.
 *
 * In addition to rendering the `hoverContent` prop on hover, this
 * component also passes `showHoverContent` as a render prop, which
 * provides a signal to the content that the user is in a hover state.
 *
 * IMPORTANT: This hover menu delegates focus management to the
 * `hoverContent` and does NOT own focus, because it should not
 * automatically "steal" focus. You must manage focus ownership,
 * otherwise it will be difficult for keyboard-only and screen
 * reader users to navigate to and from your popover.
 */
export const HoverPopover = React.memo<PropsWithChildren<HoverPopoverProps>>(
  ({ hoverContent, anchorPosition = 'downCenter', children }) => {
    const [isOpen, setIsOpen] = useState(hoverContent != null);
    const [showHoverContent, setShowHoverContent] = useState(false);
    const [, setHoverTimeout] = useState<number | undefined>(undefined);
    const popoverRef = useRef<EuiPopover>(null);

    const tryClosePopover = useCallback(() => {
      setHoverTimeout((prevHoverTimeout) => {
        clearTimeout(prevHoverTimeout);
        return undefined;
      });

      setShowHoverContent(false);
    }, []);

    const onMouseEnter = useCallback(() => {
      setHoverTimeout(
        Number(
          setTimeout(() => {
            // NOTE: the following read from the DOM is expensive, but not as
            // expensive as the default behavior, which adds a div to the body,
            // which-in turn performs a more expensive change to the layout
            if (!document.body.classList.contains(IS_DRAGGING_CLASS_NAME)) {
              setShowHoverContent(true);
            }
          }, HOVER_INTENT_DELAY)
        )
      );
    }, [setHoverTimeout, setShowHoverContent]);

    const onMouseLeave = useCallback(() => {
      tryClosePopover();
    }, [tryClosePopover]);

    const onKeyDown = useCallback(
      (keyboardEvent: React.KeyboardEvent) => {
        if (isOpen && keyboardEvent.key === 'Escape') {
          onMouseLeave();
        }
      },
      [isOpen, onMouseLeave]
    );

    useEffect(() => {
      setIsOpen(hoverContent != null && showHoverContent);
    }, [hoverContent, showHoverContent]);

    useEffect(() => {
      // in case of dynamic content i.e when the value of hoverContent changes,
      // we will try to reposition the popover so that the content does not collide with screen edge.
      if (isOpen) popoverRef?.current?.positionPopoverFluid();
    }, [hoverContent, isOpen]);

    return (
      <div onMouseLeave={onMouseLeave}>
        <EuiPopover
          ref={popoverRef}
          anchorPosition={anchorPosition}
          button={
            <div data-test-subj="HoverPopoverButton" onMouseEnter={onMouseEnter}>
              {children}
            </div>
          }
          closePopover={tryClosePopover}
          hasArrow={false}
          isOpen={isOpen}
          ownFocus={false}
          panelPaddingSize="none"
          panelStyle={{ minInlineSize: 'fit-content' }}
          panelClassName="HoverPopover__popover"
          repositionOnScroll={true}
        >
          {isOpen ? <div onKeyDown={onKeyDown}>{hoverContent}</div> : null}
        </EuiPopover>
      </div>
    );
  }
);
HoverPopover.displayName = 'HoverPopover';
