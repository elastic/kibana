/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';
import { KbnDangerCallout } from '@kbn/ui-callout';
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
    <KbnDangerCallout
      data-test-subj="sloHealthCallout"
      size="s"
      onDismiss={dismiss}
      dismissButtonProps={{
        'data-test-subj': 'sloHealthCalloutDimissButton',
        'aria-label': i18n.translate('xpack.slo.sloList.healthCallout.buttonDimissLabel', {
          defaultMessage: 'Dismiss',
        }),
      }}
      title={
        <FormattedMessage
          id="xpack.slo.sloList.healthCallout.title"
          defaultMessage="Some SLOs are unhealthy"
        />
      }
      text={
        <span data-test-subj="sloHealthCalloutDescription">
          <FormattedMessage
            id="xpack.slo.sloList.healthCallout.operationalProblemsDescription"
            defaultMessage="The following {count, plural, one {SLO} other {SLOs}} might have some operational problems."
            values={{
              count: deduplicatedList.length,
            }}
          />
        </span>
      }
      actionProps={{
        primary: {
          children: isOpen
            ? i18n.translate('xpack.slo.sloList.healthCallout.collapseLabel', {
                defaultMessage: 'Hide details',
              })
            : i18n.translate('xpack.slo.sloList.healthCallout.expandLabel', {
                defaultMessage: 'Show details',
              }),
          iconType: isOpen ? 'chevronSingleUp' : 'chevronSingleDown',
          iconSide: 'right',
          onClick: () => setIsOpen(!isOpen),
        },
      }}
    >
      {isOpen && (
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
      )}
    </KbnDangerCallout>
  );
}
