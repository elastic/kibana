/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { memo, useEffect, useMemo, useState } from 'react';
import { EuiSkeletonText, EuiTreeView } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';
import type { DataTableRecord } from '@kbn/discover-utils';
import { getFieldValue } from '@kbn/discover-utils';
import { ALERT_RULE_PARAMETERS } from '@kbn/rule-data-utils';
import {
  ALERT_ANCESTORS_ID,
  ALERT_RULE_INDICES,
} from '../../../../../common/field_maps/field_names';
import { ANALYZER_PREVIEW_LOADING_TEST_ID, ANALYZER_PREVIEW_TEST_ID } from './test_ids';
import { getTreeNodes } from '../utils/analyzer_helpers';
import type { StatsNode } from '../hooks/use_alert_prevalence_from_process_tree';
import { useAlertPrevalenceFromProcessTree } from '../hooks/use_alert_prevalence_from_process_tree';

const CHILD_COUNT_LIMIT = 3;
const ANCESTOR_LEVEL = 3;
const DESCENDANT_LEVEL = 3;

/**
 * Cache that stores fetched stats nodes
 */
interface Cache {
  statsNodes: StatsNode[];
}

export interface AnalyzerPreviewProps {
  /**
   * Indices coming from the dataView
   */
  dataViewIndices: string[];
  /**
   * Document to display in the analyzer preview. The analyzer preview will try to find the related
   * events of the document and visualize them in a tree structure.
   */
  hit: DataTableRecord;
  /**
   * When true, use `kibana.alert.ancestors.id` as the resolver document id (rule preview behavior).
   */
  shouldUseAncestor: boolean;
}

/**
 * Analyzer preview under Overview, Visualizations. It shows a tree representation of analyzer.
 */
export const AnalyzerPreview = memo(
  ({ dataViewIndices, hit, shouldUseAncestor }: AnalyzerPreviewProps) => {
    const [cache, setCache] = useState<Partial<Cache>>({});

    const alertIndices = useMemo(() => {
      const ruleIndices = getFieldValue(hit, ALERT_RULE_INDICES) as string[];
      const ruleParameters = getFieldValue(hit, ALERT_RULE_PARAMETERS) as {
        index: string | string[];
      };
      const ruleParametersIndices =
        ruleParameters && ruleParameters.index
          ? Array.isArray(ruleParameters.index)
            ? ruleParameters.index
            : [ruleParameters.index]
          : [];
      return ruleIndices?.length > 0 ? ruleIndices : ruleParametersIndices;
    }, [hit]);
    const indices = alertIndices.length > 0 ? alertIndices : dataViewIndices;

    const ancestorId = useMemo(() => getFieldValue(hit, ALERT_ANCESTORS_ID) as string, [hit]);
    const documentId = shouldUseAncestor ? ancestorId : hit.raw._id ?? ''; // use ancestor as fallback for alert preview
    const { statsNodes, loading, error } = useAlertPrevalenceFromProcessTree({
      documentId,
      indices,
    });

    useEffect(() => {
      if (statsNodes && statsNodes.length !== 0) {
        setCache({ statsNodes });
      }
    }, [statsNodes, setCache]);

    const items = useMemo(
      () =>
        getTreeNodes(cache.statsNodes ?? [], CHILD_COUNT_LIMIT, ANCESTOR_LEVEL, DESCENDANT_LEVEL),
      [cache.statsNodes]
    );

    const showAnalyzerTree = items && items.length > 0 && !error;

    if (loading) {
      return (
        <EuiSkeletonText
          data-test-subj={ANALYZER_PREVIEW_LOADING_TEST_ID}
          contentAriaLabel={i18n.translate(
            'xpack.securitySolution.flyout.document.visualizations.analyzerPreview.loadingAriaLabel',
            {
              defaultMessage: 'analyzer preview',
            }
          )}
        />
      );
    }

    if (!showAnalyzerTree) {
      return (
        <FormattedMessage
          id="xpack.securitySolution.flyout.document.visualizations.analyzerPreview.errorDescription"
          defaultMessage="An error is preventing this alert from being analyzed."
        />
      );
    }

    return (
      <EuiTreeView
        items={items}
        display="compressed"
        aria-label={i18n.translate(
          'xpack.securitySolution.flyout.document.visualizations.analyzerPreview.treeViewAriaLabel',
          {
            defaultMessage: 'Analyzer preview',
          }
        )}
        showExpansionArrows
        data-test-subj={ANALYZER_PREVIEW_TEST_ID}
      />
    );
  }
);

AnalyzerPreview.displayName = 'AnalyzerPreview';
