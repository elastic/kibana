/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiCodeBlock, EuiText } from '@elastic/eui';
import { i18n } from '@kbn/i18n';

interface MermaidPanelProps {
  mermaid: string;
}

/**
 * Dumps the raw Mermaid source. There is no in-app Mermaid renderer, so the source is shown
 * verbatim for copy-paste into an external renderer.
 */
export function MermaidPanel({ mermaid }: MermaidPanelProps) {
  if (mermaid.length === 0) {
    return (
      <EuiText color="subdued" size="s" data-test-subj="nightshiftDecisionTreeMermaidEmpty">
        {i18n.translate('xpack.significantEventsApp.decisionTrees.mermaid.empty', {
          defaultMessage: 'No Mermaid diagram is available for this tree.',
        })}
      </EuiText>
    );
  }

  return (
    <EuiCodeBlock
      language="text"
      fontSize="s"
      paddingSize="m"
      isCopyable
      overflowHeight={400}
      data-test-subj="nightshiftDecisionTreeMermaid"
    >
      {mermaid}
    </EuiCodeBlock>
  );
}
