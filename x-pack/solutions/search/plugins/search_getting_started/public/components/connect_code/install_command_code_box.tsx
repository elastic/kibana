/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiCodeBlock } from '@elastic/eui';
import {
  type AvailableLanguages,
  GettingStartedCodeExample,
} from '@kbn/search-code-examples/src/getting-started-tutorials';

interface Props {
  selectedLanguage: AvailableLanguages;
}

export const InstallCommandCodeBox = ({ selectedLanguage }: Props) => {
  const installCommand = GettingStartedCodeExample[selectedLanguage].installCommandShell;

  if (!installCommand) return null;

  return (
    <EuiCodeBlock isCopyable fontSize="m" language={'bash'}>
      {installCommand}
    </EuiCodeBlock>
  );
};
