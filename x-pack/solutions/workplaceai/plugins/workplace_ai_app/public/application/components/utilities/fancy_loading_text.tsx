/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { css, keyframes } from '@emotion/react';

const gradientAnimation = keyframes`
  0%, 100% {
    background-position: 0% 50%;
  }
  50% {
    background-position: 100% 50%;
  }
`;

const dotsAnimation = keyframes`
  0%   { content: ""; }
  25%  { content: "."; }
  50%  { content: ".."; }
  75%  { content: "..."; }
  100% { content: ""; }
`;

const fancyTextStyle = css`
  background: linear-gradient(270deg, #ec4899, #8b5cf6, #3b82f6);
  background-size: 200% 200%;
  background-clip: text;
  -webkit-background-clip: text;
  color: transparent;
  animation: ${gradientAnimation} 3s ease infinite;
  font-weight: bold;
  display: inline-block;
`;

const dotsStyle = css`
  &::after {
    content: '';
    animation: ${dotsAnimation} 1.2s steps(4, end) infinite;
    display: inline-block;
    white-space: pre;
  }
`;

interface FancyLoadingTextProps {
  text: string;
  className?: string;
}

export const FancyLoadingText = ({ text, className = '' }: FancyLoadingTextProps) => {
  return (
    <span css={[fancyTextStyle, dotsStyle]} className={className}>
      {text}
    </span>
  );
};
