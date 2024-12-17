/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';

interface TruncatedTextProps {
  text: string | null | undefined;
}

const TruncatedTextComponent: React.FC<TruncatedTextProps> = ({ text }) => {
  return text != null ? <span className="eui-fullWidth eui-textTruncate">{text}</span> : null;
};

export const TruncatedText = React.memo(TruncatedTextComponent);
TruncatedText.displayName = 'TruncatedText';
