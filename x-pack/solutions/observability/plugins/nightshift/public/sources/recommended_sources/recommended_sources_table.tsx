/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { EuiBasicTableColumn, EuiTableSelectionType } from '@elastic/eui';
import {
  EuiButton,
  EuiButtonEmpty,
  EuiCallOut,
  EuiCode,
  EuiFlexGroup,
  EuiFlexItem,
  EuiInMemoryTable,
  EuiLink,
  EuiPanel,
  EuiSkeletonText,
  EuiSpacer,
  EuiText,
} from '@elastic/eui';
import { getEbtProps } from '@kbn/ebt-click';
import type { RecommendedSource } from '@kbn/nightshift-shared';
import React, { useEffect, useRef, useState } from 'react';
import { NIGHTSHIFT_EBT_ACTIONS, NIGHTSHIFT_EBT_ELEMENTS } from '../../common/ebt_constants';
import { useCreateSources } from '../../data/sources/use_create_sources';
import { useRecommendedSources } from '../../data/sources/use_recommended_sources';
import type { SourceFormValues } from '../source_flyout/source_flyout';
import {
  ADD_SELECTED_SOURCES_LABEL,
  CREATE_SOURCE_LABEL,
  EMPTY_RECOMMENDATIONS_HINT,
  EMPTY_SOURCES_RECOMMENDATIONS_HINT,
  ENABLE_DETECTION_LABEL,
  INTRODUCTION,
  LOAD_ERROR_BODY,
  LOAD_ERROR_TITLE,
  QUERY_COLUMN_HEADER,
  RETRY_LABEL,
  SOURCES_INTRODUCTION,
  SOURCES_TABLE_CAPTION,
  TABLE_CAPTION,
  TITLE_COLUMN_HEADER,
} from './translations';

const SourceFlyout = React.lazy(() =>
  import('../source_flyout/source_flyout').then(({ SourceFlyout: Flyout }) => ({
    default: Flyout,
  }))
);

type RecommendedSourcesEntry = 'detections_page' | 'sources_page';
type SourceDraftOrigin = 'recommended' | 'custom';

interface SourceDraft {
  draftId: string;
  title: string;
  description: string;
  tags: string[];
  esql: string;
  origin: SourceDraftOrigin;
}

type FlyoutState = { mode: 'create' } | { mode: 'edit'; draftId: string };

const getRecommendedDraftId = (id: string) => `recommended-${id}`;

const toRecommendedDraft = ({
  id,
  title,
  description,
  tags,
  esql,
}: RecommendedSource): SourceDraft => ({
  draftId: getRecommendedDraftId(id),
  title,
  description,
  tags,
  esql,
  origin: 'recommended',
});

export const RecommendedSourcesTable = ({ entry }: { entry: RecommendedSourcesEntry }) => {
  const isSourcesPage = entry === 'sources_page';
  const recommendations = useRecommendedSources();
  const createSources = useCreateSources({
    successContext: isSourcesPage ? 'sources' : 'detection',
  });
  const [drafts, setDrafts] = useState<SourceDraft[]>([]);
  const [selectedDraftIds, setSelectedDraftIds] = useState<string[]>([]);
  const [flyout, setFlyout] = useState<FlyoutState>();
  const seenRecommendedDraftIds = useRef(new Set<string>());
  const nextCustomDraftId = useRef(1);

  useEffect(() => {
    if (!recommendations.data) {
      return;
    }

    const recommendedDrafts = recommendations.data.map(toRecommendedDraft);
    const recommendedDraftIds = new Set(recommendedDrafts.map(({ draftId }) => draftId));
    const newRecommendedDraftIds = recommendedDrafts
      .map(({ draftId }) => draftId)
      .filter((draftId) => !seenRecommendedDraftIds.current.has(draftId));

    newRecommendedDraftIds.forEach((draftId) => seenRecommendedDraftIds.current.add(draftId));
    setDrafts((current) => {
      const currentById = new Map(current.map((draft) => [draft.draftId, draft]));
      return [
        ...recommendedDrafts.map(
          (recommendedDraft) => currentById.get(recommendedDraft.draftId) ?? recommendedDraft
        ),
        ...current.filter(({ origin }) => origin === 'custom'),
      ];
    });
    setSelectedDraftIds((current) => {
      const retained = current.filter(
        (draftId) => !draftId.startsWith('recommended-') || recommendedDraftIds.has(draftId)
      );
      return [
        ...retained,
        ...newRecommendedDraftIds.filter((draftId) => !retained.includes(draftId)),
      ];
    });
  }, [recommendations.data]);

  const selectedDrafts = drafts.filter(({ draftId }) => selectedDraftIds.includes(draftId));
  const selectedRecommendedCount = selectedDrafts.filter(
    ({ origin }) => origin === 'recommended'
  ).length;
  const selectedCustomCount = selectedDrafts.length - selectedRecommendedCount;
  const editingDraft =
    flyout?.mode === 'edit' ? drafts.find(({ draftId }) => draftId === flyout.draftId) : undefined;

  const columns: Array<EuiBasicTableColumn<SourceDraft>> = [
    {
      field: 'title',
      name: TITLE_COLUMN_HEADER,
      render: (title: string, draft: SourceDraft) => (
        <EuiLink
          data-test-subj={`nightshiftRecommendedSourceTitle-${draft.draftId}`}
          onClick={() => setFlyout({ mode: 'edit', draftId: draft.draftId })}
        >
          {title}
        </EuiLink>
      ),
    },
    {
      field: 'esql',
      name: QUERY_COLUMN_HEADER,
      render: (esql: string) => <EuiCode transparentBackground>{esql}</EuiCode>,
    },
  ];

  const selection: EuiTableSelectionType<SourceDraft> = {
    selected: selectedDrafts,
    onSelectionChange: (selected) => setSelectedDraftIds(selected.map(({ draftId }) => draftId)),
  };

  const submitDraft = (values: SourceFormValues) => {
    if (flyout?.mode === 'edit') {
      setDrafts((current) =>
        current.map((draft) => (draft.draftId === flyout.draftId ? { ...draft, ...values } : draft))
      );
      return;
    }

    const draftId = `custom-${nextCustomDraftId.current++}`;
    setDrafts((current) => [...current, { ...values, draftId, origin: 'custom' }]);
    setSelectedDraftIds((current) => [...current, draftId]);
  };

  const createSelectedSources = async () => {
    const submittedDraftIds = new Set(selectedDrafts.map(({ draftId }) => draftId));
    const { failed } = await createSources.mutateAsync(
      selectedDrafts.map(({ draftId, title, description, tags, esql }) => ({
        draftId,
        title,
        description: description.trim() === '' ? undefined : description,
        tags,
        esql,
        enabled: true,
      }))
    );
    const failedDraftIds = new Set(failed.map(({ draftId }) => draftId));

    setDrafts((current) =>
      current.filter(
        ({ draftId }) => !submittedDraftIds.has(draftId) || failedDraftIds.has(draftId)
      )
    );
    setSelectedDraftIds((current) =>
      current.filter((draftId) => !submittedDraftIds.has(draftId) || failedDraftIds.has(draftId))
    );
  };

  return (
    <>
      <EuiPanel hasBorder data-test-subj="nightshiftRecommendedSourcesTable">
        <EuiText size="s">
          <p>{isSourcesPage ? SOURCES_INTRODUCTION : INTRODUCTION}</p>
        </EuiText>
        <EuiSpacer size="m" />

        {recommendations.isLoading && drafts.length === 0 ? (
          <EuiSkeletonText lines={3} data-test-subj="nightshiftRecommendedSourcesLoading" />
        ) : (
          <>
            {recommendations.isError && (
              <>
                <EuiCallOut
                  announceOnMount
                  color="danger"
                  iconType="error"
                  title={LOAD_ERROR_TITLE}
                  data-test-subj="nightshiftRecommendedSourcesError"
                  text={<p>{LOAD_ERROR_BODY}</p>}
                  actionProps={{
                    primary: {
                      children: RETRY_LABEL,
                      iconType: 'refresh',
                      onClick: () => void recommendations.refetch(),
                      'data-test-subj': 'nightshiftRecommendedSourcesRetryButton',
                    },
                  }}
                />
                <EuiSpacer size="m" />
              </>
            )}

            {drafts.length > 0 ? (
              <EuiInMemoryTable
                tableCaption={isSourcesPage ? SOURCES_TABLE_CAPTION : TABLE_CAPTION}
                itemId="draftId"
                items={drafts}
                columns={columns}
                selection={selection}
              />
            ) : (
              <EuiText size="s" color="subdued">
                <p>
                  {isSourcesPage ? EMPTY_SOURCES_RECOMMENDATIONS_HINT : EMPTY_RECOMMENDATIONS_HINT}
                </p>
              </EuiText>
            )}
          </>
        )}

        <EuiSpacer size="m" />
        <EuiFlexGroup justifyContent="spaceBetween" alignItems="center" responsive={false}>
          <EuiFlexItem grow={false}>
            <EuiButtonEmpty
              iconType="plus"
              onClick={() => setFlyout({ mode: 'create' })}
              data-test-subj="nightshiftRecommendedSourcesCreateButton"
              {...getEbtProps({
                action: NIGHTSHIFT_EBT_ACTIONS.CREATE_DRAFT_SOURCE,
                element: NIGHTSHIFT_EBT_ELEMENTS.RECOMMENDED_SOURCES_TABLE,
                detail: entry,
              })}
            >
              {CREATE_SOURCE_LABEL}
            </EuiButtonEmpty>
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            <EuiButton
              fill
              iconType={isSourcesPage ? 'plus' : 'check'}
              isDisabled={selectedDrafts.length === 0 || createSources.isLoading}
              isLoading={createSources.isLoading}
              onClick={() => void createSelectedSources()}
              data-test-subj="nightshiftRecommendedSourcesEnableButton"
              {...getEbtProps({
                action: isSourcesPage
                  ? NIGHTSHIFT_EBT_ACTIONS.ADD_RECOMMENDED_SOURCES
                  : NIGHTSHIFT_EBT_ACTIONS.ENABLE_DETECTION,
                element: NIGHTSHIFT_EBT_ELEMENTS.RECOMMENDED_SOURCES_TABLE,
                detail: JSON.stringify({
                  entry,
                  selected: selectedDrafts.length,
                  recommended: selectedRecommendedCount,
                  custom: selectedCustomCount,
                }),
              })}
            >
              {isSourcesPage ? ADD_SELECTED_SOURCES_LABEL : ENABLE_DETECTION_LABEL}
            </EuiButton>
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiPanel>

      {(flyout?.mode === 'create' || editingDraft) && (
        <React.Suspense fallback={null}>
          <SourceFlyout
            key={editingDraft?.draftId ?? 'new'}
            initialValues={editingDraft}
            onSubmit={submitDraft}
            onClose={() => setFlyout(undefined)}
          />
        </React.Suspense>
      )}
    </>
  );
};
