/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useState, useMemo } from 'react';
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
import type { SLODefinitionResponse, SLODefinitionResponseWithRemote } from '@kbn/slo-schema';
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

function SingleSloConfiguration({ overviewMode, onCreate, onCancel }: SingleConfigurationProps) {
  const [selectedSloDefinition, setSelectedSloDefinition] = useState<
    SLODefinitionResponse | undefined
  >();
  const [selectedInstanceId, setSelectedInstanceId] = useState<string | undefined>(ALL_VALUE);
  const [showAllGroupByInstances, setShowAllGroupByInstances] = useState(false);
  const [hasError, setHasError] = useState(false);

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

    const remoteName: string | undefined =
      'remote' in selectedSloDefinition
        ? (selectedSloDefinition as SLODefinitionResponseWithRemote).remote?.remoteName
        : undefined;

    onCreate({
      showAllGroupByInstances: finalShowAllGroupByInstances,
      sloId: selectedSloDefinition.id,
      sloInstanceId: selectedInstanceId ?? ALL_VALUE,
      remoteName,
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
                    remoteName={selectedSloDefinition?.remote?.remoteName}
                    sloId={selectedSloDefinition.id}
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
            isDisabled={!selectedSloDefinition || hasError || (hasGroupBy && !selectedInstanceId)}
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
        />
      )}
    </EuiFlyout>
  );
}
