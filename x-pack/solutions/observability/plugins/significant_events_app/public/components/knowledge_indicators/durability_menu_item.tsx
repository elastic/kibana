/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiContextMenuItem } from '@elastic/eui';
import type { KnowledgeIndicator } from '@kbn/nightshift-ai';
import { isExpirable } from '@kbn/significant-events-schema';
import { MAKE_DURABLE_LABEL, MAKE_EXPIRING_LABEL } from './hooks/use_knowledge_indicator_actions';

interface Params {
  knowledgeIndicator: KnowledgeIndicator;
  disabled: boolean;
  onToggle: (durable: boolean) => void;
}

// "Make durable" / "Make expiring" context-menu entry shared by the KI actions cell and flyout.
export function durabilityMenuItem({
  knowledgeIndicator,
  disabled,
  onToggle,
}: Params): React.ReactElement {
  const target =
    knowledgeIndicator.kind === 'feature' ? knowledgeIndicator.feature : knowledgeIndicator.query;
  const currentlyDurable = !isExpirable(target);

  return (
    <EuiContextMenuItem
      key={`${knowledgeIndicator.kind}-durability`}
      icon={currentlyDurable ? 'clock' : 'pinFilled'}
      disabled={disabled}
      onClick={() => onToggle(!currentlyDurable)}
    >
      {currentlyDurable ? MAKE_EXPIRING_LABEL : MAKE_DURABLE_LABEL}
    </EuiContextMenuItem>
  );
}
