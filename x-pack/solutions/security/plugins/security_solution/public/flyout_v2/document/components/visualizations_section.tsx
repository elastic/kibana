/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { memo, useCallback } from 'react';
import { i18n } from '@kbn/i18n';
import type { DataTableRecord } from '@kbn/discover-utils';
import { useHistory } from 'react-router-dom';
import { useStore } from 'react-redux';
import { FLYOUT_STORAGE_KEYS } from '../constants/local_storage';
import { useKibana } from '../../../common/lib/kibana';
import { useExpandSection } from '../../shared/hooks/use_expand_section';
import { ExpandableSection } from '../../shared/components/expandable_section';
import { PREFIX } from '../../../flyout/shared/test_ids';
import { AnalyzerPreviewContainer } from './analyzer_preview_container';
import { SessionPreviewContainer } from './session_preview_container';
import { flyoutProviders } from '../../shared/components/flyout_provider';
import { AnalyzerGraph } from '../../analyzer';
import type { ResolverCellActionRenderer } from '../../../resolver/types';
import { useSessionViewConfig } from '../../session_view/hooks/use_session_view_config';
import { SessionView } from '../../session_view';

export const VISUALIZATION_SECTION_TEST_ID = `${PREFIX}Visualizations` as const;

export const VISUALIZATION_SECTION_TITLE = i18n.translate(
  'xpack.securitySolution.flyout.document.visualizations.sectionTitle',
  {
    defaultMessage: 'Visualizations',
  }
);

const LOCAL_STORAGE_SECTION_KEY = 'visualizations';

export interface VisualizationsSectionProps {
  /**
   * Document to display in the overview tab
   */
  hit: DataTableRecord;
  /**
   * Optional prop to pass cell action renderer to the analyzer graph.
   */
  renderCellActions: ResolverCellActionRenderer;
}

/**
 * Third section of the overview tab in details flyout.
 * It contains analyzer preview and session view preview.
 */
export const VisualizationsSection = memo(
  ({ hit, renderCellActions }: VisualizationsSectionProps) => {
    const { services } = useKibana();
    const { overlays } = services;
    const store = useStore();
    const history = useHistory();
    const sessionViewConfig = useSessionViewConfig(hit);

    const expanded = useExpandSection({
      storageKey: FLYOUT_STORAGE_KEYS.OVERVIEW_TAB_EXPANDED_SECTIONS,
      title: LOCAL_STORAGE_SECTION_KEY,
      defaultValue: false,
    });

    const onShowAnalyzer = useCallback(
      () =>
        overlays.openSystemFlyout(
          flyoutProviders({
            services,
            store,
            history,
            children: <AnalyzerGraph hit={hit} renderCellActions={renderCellActions} />,
          }),
          {
            ownFocus: false,
            resizable: true,
            size: 'm',
            type: 'overlay',
          }
        ),
      [history, hit, overlays, renderCellActions, services, store]
    );
    const onShowSessionView = useCallback(
      () =>
        overlays.openSystemFlyout(
          flyoutProviders({
            services,
            store,
            history,
            children: (
              <SessionView
                hit={hit}
                jumpToCursor={sessionViewConfig?.jumpToCursor}
                jumpToEntityId={sessionViewConfig?.jumpToEntityId}
                renderCellActions={renderCellActions}
              />
            ),
          }),
          {
            ownFocus: false,
            resizable: true,
            size: 'm',
            type: 'overlay',
          }
        ),
      [
        history,
        hit,
        overlays,
        renderCellActions,
        services,
        sessionViewConfig?.jumpToCursor,
        sessionViewConfig?.jumpToEntityId,
        store,
      ]
    );

    return (
      <ExpandableSection
        data-test-subj={VISUALIZATION_SECTION_TEST_ID}
        expanded={expanded}
        gutterSize="s"
        localStorageKey={FLYOUT_STORAGE_KEYS.OVERVIEW_TAB_EXPANDED_SECTIONS}
        sectionId={LOCAL_STORAGE_SECTION_KEY}
        title={VISUALIZATION_SECTION_TITLE}
      >
        <SessionPreviewContainer
          disableNavigation={false}
          hit={hit}
          onShowSessionView={onShowSessionView}
          showIcon={false}
        />
        <AnalyzerPreviewContainer
          disableNavigation={false}
          hit={hit}
          onShowAnalyzer={onShowAnalyzer}
          shouldUseAncestor={false}
          showIcon={false}
        />
      </ExpandableSection>
    );
  }
);

VisualizationsSection.displayName = 'VisualizationsSection';
