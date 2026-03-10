/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiFlyoutBody } from '@elastic/eui';
import React, { createContext, memo } from 'react';
import type { DataTableRecord } from '@kbn/discover-utils';
import { MarkdownRenderer } from '../../../common/components/markdown_editor';

const EMPTY_HIT: DataTableRecord = {
  id: '',
  raw: {} as DataTableRecord['raw'],
  flattened: {},
};

export const AlertDataContext = createContext<DataTableRecord>(EMPTY_HIT);

interface InvestigationGuideViewProps {
  /**
   * Alert/event document
   */
  hit: DataTableRecord;
  /**
   * The investigation guide markdown (currently sourced from `rule.note`)
   */
  investigationGuide: string;
}

/**
 * Investigation guide that shows the markdown text of `rule.note`
 */
export const InvestigationGuideView = memo(
  ({ hit, investigationGuide }: InvestigationGuideViewProps) => (
    <EuiFlyoutBody data-test-subj="investigation-guide-full-view">
      <AlertDataContext.Provider value={hit}>
        <MarkdownRenderer textSize="s">{investigationGuide}</MarkdownRenderer>
      </AlertDataContext.Provider>
    </EuiFlyoutBody>
  )
);

InvestigationGuideView.displayName = 'InvestigationGuideView';
