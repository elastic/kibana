/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  EuiButton,
  EuiButtonEmpty,
  EuiFlexGroup,
  EuiFlexItem,
  EuiFlyout,
  EuiFlyoutBody,
  EuiFlyoutFooter,
  EuiFlyoutHeader,
  EuiSpacer,
  EuiSwitch,
  EuiTitle,
  useGeneratedHtmlId,
} from '@elastic/eui';
import { css } from '@emotion/react';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';
import type { SLOWithSummaryResponse } from '@kbn/slo-schema';
import { ALL_VALUE } from '@kbn/slo-schema';
import React, { useEffect, useState } from 'react';
import { useFetchSloList } from '../../../hooks/use_fetch_slo_list';
import { SloSelector } from './slo_selector';
import type { AlertsCustomState, SloItem } from './types';

interface SloConfigurationProps {
  initialInput?: AlertsCustomState;
  onCreate: (props: AlertsCustomState) => void;
  onCancel: () => void;
}

function toSloItem(slo: SLOWithSummaryResponse): SloItem {
  return {
    slo_id: slo.id,
    slo_instance_id: slo.instanceId,
    name: slo.name,
    group_by: [slo.groupBy].flat().filter(Boolean) as string[],
  };
}

export function SloConfiguration({ initialInput, onCreate, onCancel }: SloConfigurationProps) {
  const hasSlosWithAllInstances = initialInput?.slos?.some(
    (slo) => slo.slo_instance_id === ALL_VALUE
  );
  const sloIdsToExpand =
    initialInput?.slos
      ?.filter((slo) => slo.slo_instance_id === ALL_VALUE)
      .map((slo) => slo.slo_id) ?? [];

  const { data: expandedSloList } = useFetchSloList({
    kqlQuery: sloIdsToExpand.map((id) => `slo.id:"${id}"`).join(' or '),
    perPage: 100,
    disabled: sloIdsToExpand.length === 0,
  });

  const [showAllGroupByInstances, setShowAllGroupByInstances] = useState(() => {
    if (hasSlosWithAllInstances) {
      return initialInput?.show_all_group_by_instances ?? true;
    }
    return initialInput?.show_all_group_by_instances ?? false;
  });
  const [selectedSlos, setSelectedSlos] = useState<SloItem[]>(initialInput?.slos ?? []);
  const [hasExpandedSlos, setHasExpandedSlos] = useState(false);

  useEffect(() => {
    if (
      sloIdsToExpand.length > 0 &&
      expandedSloList?.results &&
      expandedSloList.results.length > 0 &&
      !hasExpandedSlos
    ) {
      const instancesOnly = expandedSloList.results.filter((r) => r.instanceId !== ALL_VALUE);
      if (instancesOnly.length > 0) {
        const expandedItems = instancesOnly.map((r) => toSloItem(r));
        const slosWithSpecificInstances = initialInput!.slos!.filter(
          (slo) => slo.slo_instance_id !== ALL_VALUE
        );
        setSelectedSlos([...slosWithSpecificInstances, ...expandedItems]);
        setShowAllGroupByInstances(true);
        setHasExpandedSlos(true);
      }
    }
  }, [expandedSloList?.results, initialInput, sloIdsToExpand.length, hasExpandedSlos]);

  const [hasError, setHasError] = useState(false);

  const onConfirmClick = () =>
    onCreate({ slos: selectedSlos, show_all_group_by_instances: showAllGroupByInstances });

  const hasGroupBy = (selectedSlos?.length ?? 0) > 0;

  const flyoutTitleId = useGeneratedHtmlId({
    prefix: 'alertsConfigurationFlyout',
  });

  return (
    <EuiFlyout
      onClose={onCancel}
      css={css`
        min-width: 550px;
      `}
      aria-labelledby={flyoutTitleId}
    >
      <EuiFlyoutHeader>
        <EuiTitle>
          <h2 id={flyoutTitleId}>
            {i18n.translate('xpack.slo.sloEmbeddable.config.sloSelector.headerTitle', {
              defaultMessage: 'Alerts configuration',
            })}
          </h2>
        </EuiTitle>
      </EuiFlyoutHeader>
      <EuiFlyoutBody>
        <EuiFlexGroup>
          <EuiFlexItem grow>
            <SloSelector
              initialSlos={selectedSlos}
              hasError={hasError}
              singleSelection={false}
              onSelected={(slos) => {
                setHasError(slos === undefined);
                if (Array.isArray(slos)) {
                  setSelectedSlos(
                    slos?.map((slo) => ({
                      slo_id: slo?.id ?? '',
                      slo_instance_id: slo?.instanceId ?? '',
                      name: slo?.name ?? '',
                      group_by: [slo?.groupBy].flat().filter(Boolean) as string[],
                    })) as SloItem[]
                  );
                }
              }}
            />
          </EuiFlexItem>
        </EuiFlexGroup>
        {hasGroupBy && (
          <>
            <EuiSpacer />
            <EuiSwitch
              label={i18n.translate('xpack.slo.sloConfiguration.euiSwitch.showAllGroupByLabel', {
                defaultMessage: 'Show all related group-by instances',
              })}
              checked={showAllGroupByInstances}
              onChange={(e) => {
                setShowAllGroupByInstances(e.target.checked);
              }}
            />
          </>
        )}
      </EuiFlyoutBody>
      <EuiFlyoutFooter>
        <EuiFlexGroup justifyContent="spaceBetween">
          <EuiButtonEmpty onClick={onCancel} data-test-subj="sloCancelButton">
            <FormattedMessage
              id="xpack.slo.Embeddable.config.cancelButtonLabel"
              defaultMessage="Cancel"
            />
          </EuiButtonEmpty>

          <EuiButton
            data-test-subj="sloConfirmButton"
            isDisabled={!selectedSlos || selectedSlos.length === 0 || hasError}
            onClick={onConfirmClick}
            fill
          >
            <FormattedMessage
              id="xpack.slo.embeddableSlo.config.confirmButtonLabel"
              defaultMessage="Confirm configurations"
            />
          </EuiButton>
        </EuiFlexGroup>
      </EuiFlyoutFooter>
    </EuiFlyout>
  );
}
