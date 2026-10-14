/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useRef } from 'react';
import {
  EuiBadge,
  EuiButton,
  EuiCard,
  EuiCode,
  EuiFlexGrid,
  EuiFlexGroup,
  EuiFlexItem,
  EuiIcon,
  EuiSpacer,
  EuiText,
  EuiTitle,
} from '@elastic/eui';
import type { NightshiftSource } from '@kbn/nightshift-shared';
import { KbnDangerCallout } from '@kbn/ui-callout';
import { useSourcesApi } from '../../../../../hooks/use_sources_api';
import { getFormattedError } from '../../../../../util/errors';
import {
  ADD_RECOMMENDED_SOURCE_BUTTON_LABEL,
  ADD_RECOMMENDED_SOURCE_ERROR_TITLE,
  RECOMMENDED_SOURCES_DESCRIPTION,
  RECOMMENDED_SOURCES_TITLE,
} from '../translations';
import {
  RECOMMENDED_SOURCES,
  getAvailableRecommendedSources,
  toCreateSourceRequest,
  type RecommendedSource,
} from './recommended_sources';

interface RecommendedSourcesPanelProps {
  sources: readonly NightshiftSource[];
  presets?: readonly RecommendedSource[];
}

/** One-click presets for sources the space does not have yet. Nothing is created until a click. */
export function RecommendedSourcesPanel({
  sources,
  presets = RECOMMENDED_SOURCES,
}: RecommendedSourcesPanelProps) {
  const { createSource } = useSourcesApi();
  // Mutation state lags a render behind the click; the ref blocks a second create in between.
  const pendingPresetIdRef = useRef<string>();
  const available = getAvailableRecommendedSources(sources, presets);

  if (available.length === 0) {
    return null;
  }

  const addPreset = (preset: RecommendedSource) => {
    if (pendingPresetIdRef.current) {
      return;
    }
    pendingPresetIdRef.current = preset.id;
    createSource.mutate(toCreateSourceRequest(preset), {
      onSettled: () => {
        pendingPresetIdRef.current = undefined;
      },
    });
  };

  const isPresetRequest = (preset: RecommendedSource) =>
    createSource.variables?.esql === preset.esql;

  return (
    <div data-test-subj="significantEventsAppRecommendedSources">
      <EuiTitle size="xs">
        <h3>{RECOMMENDED_SOURCES_TITLE}</h3>
      </EuiTitle>
      <EuiText size="s" color="subdued">
        <p>{RECOMMENDED_SOURCES_DESCRIPTION}</p>
      </EuiText>
      <EuiSpacer size="s" />
      <EuiFlexGrid columns={3} gutterSize="m">
        {available.map((preset) => {
          const isAdding = createSource.isLoading && isPresetRequest(preset);
          const addError =
            createSource.isError && isPresetRequest(preset) ? createSource.error : undefined;
          return (
            <EuiFlexItem key={preset.id}>
              <EuiCard
                data-test-subj={`significantEventsAppRecommendedSource-${preset.id}`}
                textAlign="left"
                icon={<EuiIcon type={preset.iconType} size="xl" aria-hidden={true} />}
                title={preset.title}
                titleSize="xs"
                description={preset.description}
                hasBorder
                footer={
                  <EuiFlexGroup direction="column" gutterSize="s">
                    <EuiFlexItem grow={false}>
                      <EuiCode>{preset.esql}</EuiCode>
                    </EuiFlexItem>
                    <EuiFlexItem grow={false}>
                      <EuiFlexGroup gutterSize="xs" wrap responsive={false}>
                        {preset.tags.map((tag) => (
                          <EuiFlexItem grow={false} key={tag}>
                            <EuiBadge color="hollow">{tag}</EuiBadge>
                          </EuiFlexItem>
                        ))}
                      </EuiFlexGroup>
                    </EuiFlexItem>
                    {addError && (
                      <EuiFlexItem grow={false}>
                        <KbnDangerCallout
                          data-test-subj="significantEventsAppRecommendedSourceError"
                          announceOnMount
                          size="s"
                          title={ADD_RECOMMENDED_SOURCE_ERROR_TITLE}
                        >
                          <p>{getFormattedError(addError).message}</p>
                        </KbnDangerCallout>
                      </EuiFlexItem>
                    )}
                    <EuiFlexItem grow={false}>
                      <div>
                        <EuiButton
                          data-test-subj="significantEventsAppRecommendedSourceAddButton"
                          size="s"
                          fill
                          iconType="plus"
                          isLoading={isAdding}
                          isDisabled={createSource.isLoading}
                          onClick={() => addPreset(preset)}
                        >
                          {ADD_RECOMMENDED_SOURCE_BUTTON_LABEL}
                        </EuiButton>
                      </div>
                    </EuiFlexItem>
                  </EuiFlexGroup>
                }
              />
            </EuiFlexItem>
          );
        })}
      </EuiFlexGrid>
    </div>
  );
}
