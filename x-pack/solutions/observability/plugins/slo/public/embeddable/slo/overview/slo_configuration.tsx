/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useState } from 'react';
import {
  EuiButton,
  EuiButtonEmpty,
  EuiFlexGroup,
  EuiFlexItem,
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
import type { SearchSLODefinitionItem } from '@kbn/slo-schema';
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
    SearchSLODefinitionItem | undefined
  >();
  const [selectedInstanceId, setSelectedInstanceId] = useState<string | undefined>(ALL_VALUE);
  const [hasError, setHasError] = useState(false);
  const showAllGroupByInstances = selectedInstanceId === ALL_VALUE;

  const hasGroupBy = selectedSloDefinition?.groupBy
    ? selectedSloDefinition.groupBy.length > 0 && !selectedSloDefinition.groupBy.includes(ALL_VALUE)
    : false;

  const onConfirmClick = () => {
    if (!selectedSloDefinition) {
      setHasError(true);
      return;
    }

    const remoteName: string | undefined = selectedSloDefinition?.remote?.remoteName;

    onCreate({
      showAllGroupByInstances,
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
              <EuiFlexItem data-test-subj="singleSloSelector" grow>
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
                    remoteName={selectedSloDefinition.remote?.remoteName}
                    sloId={selectedSloDefinition.id}
                    onSelected={(instanceId) => {
                      setSelectedInstanceId(instanceId);
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
