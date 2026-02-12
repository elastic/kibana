/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React, { useEffect, useMemo, useState } from 'react';
import { find } from 'lodash/fp';
import { EuiSkeletonText, EuiTreeView } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';
import { useDataView } from '../../../../data_view_manager/hooks/use_data_view';
import { ANALYZER_PREVIEW_LOADING_TEST_ID, ANALYZER_PREVIEW_TEST_ID } from './test_ids';
import { getTreeNodes } from '../utils/analyzer_helpers';
import { ANCESTOR_ID, RULE_INDICES } from '../../shared/constants/field_names';
import { useDocumentDetailsContext } from '../../shared/context';
import type { StatsNode } from '../../shared/hooks/use_alert_prevalence_from_process_tree';
import { useAlertPrevalenceFromProcessTree } from '../../shared/hooks/use_alert_prevalence_from_process_tree';
import { isActiveTimeline } from '../../../../helpers';
import { getField } from '../../shared/utils';
import { PageScope } from '../../../../data_view_manager/constants';
import { useSelectedPatterns } from '../../../../data_view_manager/hooks/use_selected_patterns';

const DATAVIEW_ERROR = (
  <FormattedMessage
    id="xpack.securitySolution.flyout.right.visualizations.analyzerPreview.dataViewErrorDescription"
    defaultMessage="Unable to retrieve the data view for analyzer."
  />
);

const ANALYZER_ERROR = (
  <FormattedMessage
    id="xpack.securitySolution.flyout.right.visualizations.analyzerPreview.errorDescription"
    defaultMessage="An error is preventing this alert from being analyzed."
  />
);

const CHILD_COUNT_LIMIT = 3;
const ANCESTOR_LEVEL = 3;
const DESCENDANT_LEVEL = 3;

/**
 * Cache that stores fetched stats nodes
 */
interface Cache {
  statsNodes: StatsNode[];
}

/**
 * Analyzer preview under Overview, Visualizations. It shows a tree representation of analyzer.
 */
export const AnalyzerPreview: React.FC = () => {
  const [cache, setCache] = useState<Partial<Cache>>({});
  const {
    dataFormattedForFieldBrowser: data,
    getFieldsData,
    scopeId,
    eventId,
    isRulePreview,
  } = useDocumentDetailsContext();
  const ancestorId = getField(getFieldsData(ANCESTOR_ID)) ?? '';
  const documentId = isRulePreview ? ancestorId : eventId; // use ancestor as fallback for alert preview

  const indexPatterns = useSelectedPatterns(PageScope.analyzer);

  const { dataView, status } = useDataView(PageScope.analyzer);

  const index = find({ category: 'kibana', field: RULE_INDICES }, data);
  const indices = index?.values ?? indexPatterns; // adding sourcerer indices for non-alert documents

  const needToFallbackToDataViewIndices = Boolean(index?.values);
  const dataViewLoading =
    needToFallbackToDataViewIndices && (status === 'loading' || status === 'pristine');

  const {
    statsNodes,
    loading: dataLoading,
    error,
  } = useAlertPrevalenceFromProcessTree({
    isActiveTimeline: isActiveTimeline(scopeId),
    documentId,
    indices,
  });

  useEffect(() => {
    if (statsNodes && statsNodes.length !== 0) {
      setCache({ statsNodes });
    }
  }, [statsNodes, setCache]);

  const items = useMemo(
    () => getTreeNodes(cache.statsNodes ?? [], CHILD_COUNT_LIMIT, ANCESTOR_LEVEL, DESCENDANT_LEVEL),
    [cache.statsNodes]
  );

  const showAnalyzerTree = items && items.length > 0 && !error;

  if (dataViewLoading || dataLoading) {
    return (
      <EuiSkeletonText
        data-test-subj={ANALYZER_PREVIEW_LOADING_TEST_ID}
        contentAriaLabel={i18n.translate(
          'xpack.securitySolution.flyout.right.visualizations.analyzerPreview.loadingAriaLabel',
          {
            defaultMessage: 'analyzer preview',
          }
        )}
      />
    );
  }

  if (status === 'error' || (status === 'ready' && !dataView.hasMatchedIndices())) {
    return DATAVIEW_ERROR;
  }

  if (!showAnalyzerTree) {
    return ANALYZER_ERROR;
  }

  return (
    <EuiTreeView
      items={items}
      display="compressed"
      aria-label={i18n.translate(
        'xpack.securitySolution.flyout.right.visualizations.analyzerPreview.treeViewAriaLabel',
        {
          defaultMessage: 'Analyzer preview',
        }
      )}
      showExpansionArrows
      data-test-subj={ANALYZER_PREVIEW_TEST_ID}
    />
  );
};

AnalyzerPreview.displayName = 'AnalyzerPreview';
