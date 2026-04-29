/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiSpacer } from '@elastic/eui';
import { MarkdownRenderer } from '../../../../common/components/markdown_editor';
import type { InvestigationGuide } from '../../../../../common/api/detection_engine/model/rule_schema';

interface RuleInvestigationGuideTabProps {
  note: InvestigationGuide;
}

export const RuleInvestigationGuideTab = ({ note }: RuleInvestigationGuideTabProps) => {
  return (
    <>
      <EuiSpacer size="m" />
      <MarkdownRenderer textSize="s">{note}</MarkdownRenderer>
    </>
  );
};
