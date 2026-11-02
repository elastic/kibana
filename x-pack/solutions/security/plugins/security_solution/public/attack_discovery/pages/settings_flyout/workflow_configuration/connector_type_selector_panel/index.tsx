/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useEuiTheme } from '@elastic/eui';
import { css } from '@emotion/react';
import React, { useCallback, useMemo, useState } from 'react';

export interface ConnectorTypeSelectorPanelProps {
  children: React.ReactNode;
}

/**
 * Wraps the action form and re-styles the "Select a connector type"
 * section (rendered by the shared ActionForm from triggers_actions_ui)
 * as a bordered, collapsible panel matching the Figma design.
 *
 * The shared ActionForm renders the keypad section with a unique
 * `id="alertActionTypeTitle"` which this component uses as a CSS anchor.
 */
const ConnectorTypeSelectorPanelComponent: React.FC<ConnectorTypeSelectorPanelProps> = ({
  children,
}) => {
  const { euiTheme } = useEuiTheme();
  const [isOpen, setIsOpen] = useState(true);

  const handleClick = useCallback((e: React.MouseEvent) => {
    const target = e.target as HTMLElement;
    if (target.closest('#alertActionTypeTitle')) {
      setIsOpen((prev) => !prev);
    }
  }, []);

  const containerStyle = useMemo(
    () => css`
      /* Restyle the connector accordion button content (e.g. "Elastic-Cloud-SMTP")
         to match the Figma mock. Reduce the EUI default 24px padding-left
         that separates the content from the accordion arrow. Target .euiText
         directly because its Emotion class sets font-size explicitly. */
      .actAccordionActionForm__button {
        font-size: ${euiTheme.font.scale.s}rem;
        font-weight: ${euiTheme.font.weight.regular};
      }

      .actAccordionActionForm__button .euiText {
        font-size: ${euiTheme.font.scale.s}rem;
      }

      /* Override the 24px padding-left set by ActionForm's Emotion class
         (specificity 0,3,0). Compound .euiAccordion.actAccordionActionForm
         targets the same element to reach 0,4,0. */
      .euiAccordion.actAccordionActionForm .actAccordionActionForm__button {
        padding-left: ${euiTheme.size.s};
      }

      /* Title row: top/left/right border only when expanded (no bottom)
         so it merges with the keypad border below into one panel */
      #alertActionTypeTitle {
        border: ${euiTheme.border.thin};
        ${isOpen ? 'border-bottom: none;' : ''}
        border-radius: ${isOpen
          ? `${euiTheme.border.radius.medium} ${euiTheme.border.radius.medium} 0 0`
          : euiTheme.border.radius.medium};
        padding: ${euiTheme.size.s} ${euiTheme.size.m};
        cursor: pointer;

        h5 {
          font-size: ${euiTheme.font.scale.s}rem;
          font-weight: ${euiTheme.font.weight.semiBold};
          line-height: 1.5;
          display: inline-flex;
          align-items: center;
          gap: ${euiTheme.size.m};

          &::before {
            content: '';
            display: block;
            flex-shrink: 0;
            width: 6px;
            height: 6px;
            border-right: ${euiTheme.border.width.thin} solid currentColor;
            border-bottom: ${euiTheme.border.width.thin} solid currentColor;
            transition: transform ${euiTheme.animation.fast};
            transform: rotate(${isOpen ? '45deg' : '-45deg'});
          }
        }
      }

      /* Hide the spacer between the title and the keypad grid */
      #alertActionTypeTitle + div {
        display: none;
      }

      /* Connector type keypad grid: bottom/left/right border only (no top)
         so it continues the title border into one seamless panel */
      #alertActionTypeTitle + div + div {
        border: ${euiTheme.border.thin};
        border-top: none;
        border-radius: 0 0 ${euiTheme.border.radius.medium} ${euiTheme.border.radius.medium};
        padding: ${euiTheme.size.m};
        display: ${isOpen ? 'flex' : 'none'};
      }
    `,
    [euiTheme, isOpen]
  );

  return (
    // eslint-disable-next-line jsx-a11y/click-events-have-key-events
    <div css={containerStyle} data-test-subj="connectorTypeSelectorPanel" onClick={handleClick}>
      {children}
    </div>
  );
};

ConnectorTypeSelectorPanelComponent.displayName = 'ConnectorTypeSelectorPanel';

export const ConnectorTypeSelectorPanel = React.memo(ConnectorTypeSelectorPanelComponent);
