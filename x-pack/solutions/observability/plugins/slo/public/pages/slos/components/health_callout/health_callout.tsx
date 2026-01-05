/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiButtonEmpty, EuiCallOut, EuiFlexGroup, EuiFlexItem } from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n-react';
import type { SLOWithSummaryResponse } from '@kbn/slo-schema';
import { paths } from '@kbn/slo-shared-plugin/common/locators/paths';
import { uniqBy } from 'lodash';
import React, { useState } from 'react';
import { useFetchSloHealth } from '../../../../hooks/use_fetch_slo_health';
import { ContentWithInspectCta } from '../../../slo_details/components/health_callout/content_with_inspect_cta';

const CALLOUT_SESSION_STORAGE_KEY = 'slo_health_callout_hidden';

export function HealthCallout({ sloList = [] }: { sloList: SLOWithSummaryResponse[] }) {
  const { isLoading, isError, data: results } = useFetchSloHealth({ list: sloList });
  const [showCallOut, setShowCallOut] = useState(
    !sessionStorage.getItem(CALLOUT_SESSION_STORAGE_KEY)
  );
  const [isOpen, setIsOpen] = useState(false);

  const dismiss = () => {
    setShowCallOut(false);
    sessionStorage.setItem('slo_health_callout_hidden', 'true');
  };

  if (!showCallOut) {
    return null;
  }

  if (isLoading || isError || results === undefined || results?.length === 0) {
    return null;
  }

  const problematicSloList = results.filter((result) => result.health.isProblematic);
  if (problematicSloList.length === 0) {
    return null;
  }

  const deduplicatedList = uniqBy(problematicSloList, (item) => item.id);

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
                id="xpack.slo.sloList.healthCallout.operationalProblemsDescription"
                defaultMessage="The following {count, plural, one {SLO} other {SLOs}} might have some operational problems. You can inspect {count, plural, one {it} other {each one}} here:"
                values={{
                  count: deduplicatedList.length,
                }}
              />
            </span>
            <ul>
              {deduplicatedList.map((result) => (
                <li key={result.id}>
                  <ContentWithInspectCta
                    textSize="xs"
                    content={result.name}
                    url={paths.sloDetails(result.id, result.instanceId, undefined, 'overview')}
                  />
                </li>
              ))}
            </ul>
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
