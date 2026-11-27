/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { css } from '@emotion/react';
import type { IconType, UseEuiTheme } from '@elastic/eui';
import { anthropicIcon, cursorIcon } from '@kbn/custom-icons';

type LogoProps = React.HTMLAttributes<HTMLSpanElement> & { readonly titleId?: string };

// The logos are bundled as SVG URLs, which `EuiIcon` renders as `<img>` in a fixed colour. Masking
// the SVG and filling it with `textParagraph` keeps it readable in both colour modes.
const createMaskedLogo = (url: string, displayName: string): React.FC<LogoProps> => {
  const Logo: React.FC<LogoProps> = ({ titleId, ...props }) => (
    <span
      {...props}
      css={({ euiTheme }: UseEuiTheme) => css`
        display: inline-block;
        inline-size: ${euiTheme.size.base};
        block-size: ${euiTheme.size.base};
        background-color: ${euiTheme.colors.textParagraph};
        mask-image: url(${url});
        mask-size: contain;
        mask-repeat: no-repeat;
        mask-position: center;
      `}
    />
  );
  Logo.displayName = displayName;
  return Logo;
};

const AGENT_LOGOS: Readonly<Record<string, IconType>> = {
  claude_code: createMaskedLogo(anthropicIcon, 'ClaudeCodeLogo'),
  cursor: createMaskedLogo(cursorIcon, 'CursorLogo'),
};

/** Product logo for `process.ai_agent.name`, falling back to a generic AI icon. */
export const getAgentIconType = (agentName: string): IconType =>
  AGENT_LOGOS[agentName] ?? 'sparkles';
