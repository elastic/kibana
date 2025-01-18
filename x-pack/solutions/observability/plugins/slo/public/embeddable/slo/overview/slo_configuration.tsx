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
  EuiSwitch,
  EuiSpacer,
  EuiFlyout,
  EuiFlyoutHeader,
  EuiFlyoutBody,
  EuiFlyoutFooter,
  EuiTitle,
} from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n-react';
import { ALL_VALUE } from '@kbn/slo-schema';
import { i18n } from '@kbn/i18n';
import { SloSelector } from '../alerts/slo_selector';

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
  const [selectedSlo, setSelectedSlo] = useState<SingleSloCustomInput>();
  const [showAllGroupByInstances, setShowAllGroupByInstances] = useState(false);
  const [hasError, setHasError] = useState(false);
  const hasGroupBy = selectedSlo && selectedSlo.sloInstanceId !== ALL_VALUE;

  const onConfirmClick = () =>
    onCreate({
      showAllGroupByInstances,
      sloId: selectedSlo?.sloId,
      sloInstanceId: selectedSlo?.sloInstanceId,
      remoteName: selectedSlo?.remoteName,
      overviewMode,
    });

  return (
    <>
      <EuiFlyoutBody>
        <EuiFlexGroup>
          <EuiFlexItem>
            <EuiFlexGroup>
              <EuiFlexItem data-test-subj="singleSloSelector" grow>
                <SloSelector
                  singleSelection={true}
                  hasError={hasError}
                  onSelected={(slo) => {
                    setHasError(slo === undefined);
                    if (slo && 'id' in slo) {
                      setSelectedSlo({
                        sloId: slo.id,
                        sloInstanceId: slo.instanceId,
                        remoteName: slo.remote?.remoteName,
                      });
                    }
                  }}
                />
              </EuiFlexItem>
            </EuiFlexGroup>
            {hasGroupBy && (
              <>
                <EuiSpacer />
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
              </>
            )}
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
            isDisabled={!selectedSlo || hasError}
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

  return (
    <EuiFlyout data-test-subj="sloSingleOverviewConfiguration" onClose={onCancel}>
      <EuiFlyoutHeader>
        <EuiFlexGroup direction="column">
          <EuiFlexItem>
            <EuiTitle>
              <h2>
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
