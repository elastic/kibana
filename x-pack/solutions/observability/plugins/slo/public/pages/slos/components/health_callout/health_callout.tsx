/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiButtonEmpty, EuiCallOut, EuiFlexGroup, EuiFlexItem } from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n-react';
import type { SLOWithSummaryResponse } from '@kbn/slo-schema';
import React, { useState } from 'react';
import { useFetchSloHealth } from '../../../../hooks/use_fetch_slo_health';
import { useKibana } from '../../../../hooks/use_kibana';
import { getSloHealthStateText } from '../../../../lib/slo_health_helpers';
import { SloHealthIssuesList } from './slo_health_issues_list';

const CALLOUT_SESSION_STORAGE_KEY = 'slo_health_callout_hidden';

// export function HealthCallout({ sloList }: { sloList: SLOWithSummaryResponse[] }) {
export function HealthCallout({ sloList = [] }: { sloList: SLOWithSummaryResponse[] }) {
  const { http } = useKibana().services;
  const { isLoading, isError, data: results } = useFetchSloHealth({ list: sloList });
  const [showCallOut, setShowCallOut] = useState(
    !sessionStorage.getItem(CALLOUT_SESSION_STORAGE_KEY)
  );
  const [isOpen, setIsOpen] = useState(false);

  if (!showCallOut) {
    return null;
  }

  if (isLoading || isError || results === undefined || results?.length === 0) {
    return null;
  }

  const unhealthyAndMissingSloList = results.filter(
    (result) => result.health.overall === 'unhealthy' || result.health.overall === 'missing'
  );
  if (unhealthyAndMissingSloList.length === 0) {
    return null;
  }

  const hasUnhealthy = unhealthyAndMissingSloList.some(
    (result) => result.health.rollup === 'unhealthy' || result.health.summary === 'unhealthy'
  );
  const hasMissing = unhealthyAndMissingSloList.some(
    (result) => result.health.rollup === 'missing' || result.health.summary === 'missing'
  );

  const dismiss = () => {
    setShowCallOut(false);
    sessionStorage.setItem('slo_health_callout_hidden', 'true');
  };

  const stateText = getSloHealthStateText(hasUnhealthy, hasMissing);

  return (
    <EuiCallOut
      data-test-subj="sloHealthCallout"
      color="danger"
      iconType={isOpen ? 'arrowDown' : 'arrowRight'}
      size="s"
      onClick={(e) => {
        setIsOpen(!isOpen);
      }}
      title={
        <FormattedMessage
          id="xpack.slo.sloList.healthCallout.title"
          defaultMessage="Some SLOs are unhealthy"
        />
      }
    >
      {isOpen && (
        <EuiFlexGroup
          gutterSize="xs"
          direction="column"
          alignItems="flexStart"
          onClick={(e) => {
            e.stopPropagation();
          }}
        >
          <EuiFlexItem>
            <span data-test-subj="sloHealthCalloutDescription">
              <FormattedMessage
                id="xpack.slo.sloList.healthCallout.description"
                defaultMessage="The following {count, plural, one {SLO is} other {SLOs are}}
          in an unhealthy state. Data may be missing or incomplete. You can inspect {count, plural, one {it} other {each one}} here:"
                values={{
                  count: unhealthyAndMissingSloList.reduce(
                    (acc, result) =>
                      acc +
                      (result.health.rollup !== 'healthy' ? 1 : 0) +
                      (result.health.summary !== 'healthy' ? 1 : 0),
                    0
                  ),
                  stateText,
                }}
              />
            </span>
            <SloHealthIssuesList
              results={unhealthyAndMissingSloList}
              linkToTransformPage={false}
              externalLinkTextSize="s"
            />
          </EuiFlexItem>
          <EuiFlexGroup direction="row" gutterSize="xs">
            <EuiFlexItem grow={false}>
              <EuiButtonEmpty
                data-test-subj="sloHealthCalloutDimissButton"
                color="text"
                size="s"
                onClick={dismiss}
              >
                <FormattedMessage
                  id="xpack.slo.sloList.healthCallout.buttonDimissLabel"
                  defaultMessage="Dismiss"
                />
              </EuiButtonEmpty>
            </EuiFlexItem>
          </EuiFlexGroup>
        </EuiFlexGroup>
      )}
    </EuiCallOut>
  );
}
