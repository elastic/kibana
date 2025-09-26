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
import { getSLOSummaryTransformId, getSLOTransformId } from '../../../../../common/constants';
import { useFetchSloHealth } from '../../../../hooks/use_fetch_slo_health';
import { TransformDisplayText } from '../../../slo_details/components/unhealthy_transform_display_text';

const CALLOUT_SESSION_STORAGE_KEY = 'slo_health_callout_hidden';

export function HealthCallout({ sloList }: { sloList: SLOWithSummaryResponse[] }) {
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
  const unhealthySloList = results.filter((result) => result.health.overall === 'unhealthy');
  if (unhealthySloList.length === 0) {
    return null;
  }

  const unhealthyRollupTransforms = results.filter(
    (result) => result.health.rollup === 'unhealthy'
  );
  const unhealthySummaryTransforms = results.filter(
    (result) => result.health.summary === 'unhealthy'
  );

  const dismiss = () => {
    setShowCallOut(false);
    sessionStorage.setItem('slo_health_callout_hidden', 'true');
  };

  return (
    <EuiCallOut
      color="danger"
      iconType={isOpen ? 'arrowDown' : 'arrowRight'}
      size="s"
      onClick={(e) => {
        setIsOpen(!isOpen);
      }}
      title={
        <FormattedMessage
          id="xpack.slo.sloList.healthCallout.title"
          defaultMessage="Transform error detected"
        />
      }
    >
      {isOpen && (
        <EuiFlexGroup
          direction="column"
          alignItems="flexStart"
          onClick={(e) => {
            e.stopPropagation();
          }}
        >
          <EuiFlexItem>
            <FormattedMessage
              id="xpack.slo.sloList.healthCallout.description"
              defaultMessage="The following {count, plural, one {transform is} other {transforms are}
          } in an unhealthy state:"
              values={{
                count: unhealthyRollupTransforms.length + unhealthySummaryTransforms.length,
              }}
            />
            <ul>
              {unhealthyRollupTransforms.map((result) => (
                <li key={result.sloId}>
                  <TransformDisplayText
                    textSize="xs"
                    transformId={getSLOTransformId(result.sloId, result.sloRevision)}
                  />
                </li>
              ))}
              {unhealthySummaryTransforms.map((result) => (
                <li key={result.sloId}>
                  <TransformDisplayText
                    textSize="xs"
                    transformId={getSLOSummaryTransformId(result.sloId, result.sloRevision)}
                  />
                </li>
              ))}
            </ul>
          </EuiFlexItem>
          <EuiFlexGroup direction="row">
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
