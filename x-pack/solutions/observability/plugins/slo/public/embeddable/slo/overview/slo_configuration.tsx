/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useState, useEffect, useMemo } from 'react';
import {
  EuiButton,
  EuiButtonEmpty,
  EuiFlexGroup,
  EuiFlexItem,
  EuiSwitch,
  EuiSpacer,
  EuiFlyout,
  EuiFlyoutHeader,
  EuiFlyoutBody,
  EuiFlyoutFooter,
  EuiTitle,
  useGeneratedHtmlId,
} from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n-react';
import { ALL_VALUE } from '@kbn/slo-schema';
import { i18n } from '@kbn/i18n';
import type { SLODefinitionResponse } from '@kbn/slo-schema';
import { useFetchSloDetails } from '../../../hooks/use_fetch_slo_details';
import { SloDefinitionSelector } from './slo_definition_selector';
import { SloInstanceSelector } from './slo_instance_selector';

import type {
  SingleSloCustomInput,
  GroupSloCustomInput,
  GroupFilters,
  OverviewMode,
} from './types';
import { SloGroupFilters } from './group_view/slo_group_filters';
import { OverviewModeSelector } from './overview_mode_selector';

interface SloConfigurationProps {
  initialInput?: GroupSloCustomInput;
  onCreate: (props: SingleSloCustomInput | GroupSloCustomInput) => void;
  onCancel: () => void;
}

interface SingleConfigurationProps {
  onCreate: (props: SingleSloCustomInput) => void;
  onCancel: () => void;
  overviewMode: OverviewMode;
}

interface GroupConfigurationProps {
  onCreate: (props: GroupSloCustomInput) => void;
  onCancel: () => void;
  overviewMode: OverviewMode;
  initialInput?: GroupSloCustomInput;
}

function SingleSloConfiguration({
  overviewMode,
  onCreate,
  onCancel,
  initialInput,
}: SingleConfigurationProps & { initialInput?: SingleSloCustomInput }) {
  const [selectedSloDefinition, setSelectedSloDefinition] = useState<
    SLODefinitionResponse | undefined
  >();
  const [selectedInstanceId, setSelectedInstanceId] = useState<string | undefined>(
    initialInput?.sloInstanceId ?? ALL_VALUE
  );
  const [showAllGroupByInstances, setShowAllGroupByInstances] = useState(
    initialInput?.showAllGroupByInstances ?? false
  );
  const [hasError, setHasError] = useState(false);

  // For backward compatibility: fetch SLO details if we have an initial sloId
  const { data: initialSloData } = useFetchSloDetails({
    sloId: initialInput?.sloId,
    instanceId: initialInput?.sloInstanceId,
    remoteName: initialInput?.remoteName,
    shouldRefetch: false,
  });

  // Initialize selected SLO definition from initial data (backward compatibility)
  useEffect(() => {
    if (initialSloData && !selectedSloDefinition) {
      // Convert SLOWithSummaryResponse to SLODefinitionResponse format
      // The SLO details response contains the definition fields we need
      const definition: SLODefinitionResponse = {
        id: initialSloData.id,
        name: initialSloData.name,
        description: initialSloData.description,
        indicator: initialSloData.indicator,
        timeWindow: initialSloData.timeWindow,
        budgetingMethod: initialSloData.budgetingMethod,
        objective: initialSloData.objective,
        settings: initialSloData.settings,
        revision: initialSloData.revision,
        enabled: initialSloData.enabled,
        tags: initialSloData.tags,
        createdAt: initialSloData.createdAt,
        updatedAt: initialSloData.updatedAt,
        groupBy: initialSloData.groupBy,
        version: initialSloData.version,
        ...(initialSloData.remote && { remote: initialSloData.remote }),
      };
      setSelectedSloDefinition(definition);
    }
  }, [initialSloData, selectedSloDefinition]);

  // Check if the selected SLO has groupBy (not ALL_VALUE and has values)
  const hasGroupBy = useMemo(() => {
    if (!selectedSloDefinition?.groupBy) {
      return false;
    }
    const groupBy = selectedSloDefinition.groupBy;
    if (groupBy === ALL_VALUE) {
      return false;
    }
    if (Array.isArray(groupBy)) {
      return groupBy.length > 0 && !groupBy.includes(ALL_VALUE);
    }
    return groupBy !== ALL_VALUE;
  }, [selectedSloDefinition]);

  const onConfirmClick = () => {
    if (!selectedSloDefinition) {
      setHasError(true);
      return;
    }

    // When "All instances" is selected, ensure showAllGroupByInstances is true
    const finalShowAllGroupByInstances =
      selectedInstanceId === ALL_VALUE ? true : showAllGroupByInstances;

    onCreate({
      showAllGroupByInstances: finalShowAllGroupByInstances,
      sloId: selectedSloDefinition.id,
      sloInstanceId: selectedInstanceId ?? ALL_VALUE,
      remoteName: selectedSloDefinition.remote?.remoteName,
      overviewMode,
    });
  };

  return (
    <>
      <EuiFlyoutBody>
        <EuiFlexGroup>
          <EuiFlexItem>
            <EuiFlexGroup direction="column" gutterSize="m">
              <EuiFlexItem data-test-subj="singleSloDefinitionSelector" grow>
                <SloDefinitionSelector
                  initialSloId={initialInput?.sloId}
                  hasError={hasError && !selectedSloDefinition}
                  onSelected={(slo) => {
                    setSelectedSloDefinition(slo);
                    setHasError(slo === undefined);
                    // Reset instance selection when SLO changes
                    if (slo) {
                      setSelectedInstanceId(undefined);
                    }
                  }}
                />
              </EuiFlexItem>
              {hasGroupBy && selectedSloDefinition && (
                <EuiFlexItem data-test-subj="singleSloInstanceSelector" grow>
                  <SloInstanceSelector
                    sloId={selectedSloDefinition.id}
                    initialInstanceId={selectedInstanceId}
                    onSelected={(instanceId) => {
                      setSelectedInstanceId(instanceId);
                      // When "All instances" is selected, automatically enable showAllGroupByInstances
                      if (instanceId === ALL_VALUE) {
                        setShowAllGroupByInstances(true);
                      } else {
                        // When a specific instance is selected, reset the toggle
                        setShowAllGroupByInstances(false);
                      }
                    }}
                  />
                </EuiFlexItem>
              )}
              {hasGroupBy && selectedInstanceId && selectedInstanceId !== ALL_VALUE && (
                <EuiFlexItem>
                  <EuiSwitch
                    label={i18n.translate(
                      'xpack.slo.sloConfiguration.euiSwitch.showAllGroupByLabel',
                      {
                        defaultMessage: 'Show all related group-by instances',
                      }
                    )}
                    checked={showAllGroupByInstances}
                    onChange={(e) => {
                      setShowAllGroupByInstances(e.target.checked);
                    }}
                  />
                </EuiFlexItem>
              )}
            </EuiFlexGroup>
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiFlyoutBody>
      <EuiFlyoutFooter>
        <EuiFlexGroup justifyContent="spaceBetween">
          <EuiButtonEmpty onClick={onCancel} data-test-subj="sloCancelButton">
            <FormattedMessage
              id="xpack.slo.sloEmbeddable.config.cancelButtonLabel"
              defaultMessage="Cancel"
            />
          </EuiButtonEmpty>

          <EuiButton
            data-test-subj="sloConfirmButton"
            isDisabled={!selectedSloDefinition || hasError}
            onClick={onConfirmClick}
            fill
          >
            <FormattedMessage
              id="xpack.slo.overviewEmbeddableSlo.config.confirmButtonLabel"
              defaultMessage="Save"
            />
          </EuiButton>
        </EuiFlexGroup>
      </EuiFlyoutFooter>
    </>
  );
}

function GroupSloConfiguration({
  overviewMode,
  onCreate,
  onCancel,
  initialInput,
}: GroupConfigurationProps) {
  const [selectedGroupFilters, setSelectedGroupFilters] = useState<GroupFilters>({
    groupBy: initialInput?.groupFilters?.groupBy ?? 'status',
    filters: initialInput?.groupFilters?.filters ?? [],
    kqlQuery: initialInput?.groupFilters?.kqlQuery ?? '',
    groups: initialInput?.groupFilters?.groups ?? [],
  });

  const onConfirmClick = () =>
    onCreate({
      groupFilters: selectedGroupFilters,
      overviewMode,
    });

  return (
    <>
      <EuiFlyoutBody data-test-subj="sloGroupOverviewConfiguration">
        <EuiFlexGroup>
          <EuiFlexItem>
            <EuiFlexGroup>
              <EuiFlexItem>
                <SloGroupFilters
                  selectedFilters={selectedGroupFilters}
                  onSelected={(prop, value) => {
                    setSelectedGroupFilters((prevState) => ({ ...prevState, [prop]: value }));
                  }}
                />
              </EuiFlexItem>
            </EuiFlexGroup>
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiFlyoutBody>
      <EuiFlyoutFooter>
        <EuiFlexGroup justifyContent="spaceBetween">
          <EuiButtonEmpty onClick={onCancel} data-test-subj="sloCancelButton">
            <FormattedMessage
              id="xpack.slo.sloEmbeddable.config.cancelButtonLabel"
              defaultMessage="Cancel"
            />
          </EuiButtonEmpty>

          <EuiButton data-test-subj="sloConfirmButton" onClick={onConfirmClick} fill>
            <FormattedMessage
              id="xpack.slo.overviewEmbeddableSlo.config.confirmButtonLabel"
              defaultMessage="Save"
            />
          </EuiButton>
        </EuiFlexGroup>
      </EuiFlyoutFooter>
    </>
  );
}

export function SloConfiguration({ initialInput, onCreate, onCancel }: SloConfigurationProps) {
  const [overviewMode, setOverviewMode] = useState<OverviewMode>(
    initialInput?.overviewMode ?? 'single'
  );
  const flyoutTitleId = useGeneratedHtmlId({
    prefix: 'overviewConfigurationFlyout',
  });

  return (
    <EuiFlyout
      data-test-subj="sloSingleOverviewConfiguration"
      onClose={onCancel}
      aria-labelledby={flyoutTitleId}
    >
      <EuiFlyoutHeader>
        <EuiFlexGroup direction="column">
          <EuiFlexItem>
            <EuiTitle>
              <h2 id={flyoutTitleId}>
                {i18n.translate('xpack.slo.overviewEmbeddable.config.sloSelector.headerTitle', {
                  defaultMessage: 'Overview configuration',
                })}
              </h2>
            </EuiTitle>
          </EuiFlexItem>
          {initialInput?.overviewMode === undefined && (
            <EuiFlexItem>
              <OverviewModeSelector
                value={overviewMode}
                onChange={(mode) => setOverviewMode(mode)}
              />
              <EuiSpacer size="m" />
            </EuiFlexItem>
          )}
        </EuiFlexGroup>
      </EuiFlyoutHeader>
      {overviewMode === 'groups' ? (
        <GroupSloConfiguration
          initialInput={initialInput as GroupSloCustomInput}
          overviewMode={overviewMode}
          onCreate={onCreate}
          onCancel={onCancel}
        />
      ) : (
        <SingleSloConfiguration
          overviewMode={overviewMode}
          onCreate={onCreate}
          onCancel={onCancel}
          initialInput={initialInput as SingleSloCustomInput}
        />
      )}
    </EuiFlyout>
  );
}
