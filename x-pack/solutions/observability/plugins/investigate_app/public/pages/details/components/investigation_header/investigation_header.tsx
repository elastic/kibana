/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiFlexGroup, EuiFlexItem, EuiText } from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n-react';
import React from 'react';
import moment from 'moment';
import { InvestigationStatusBadge } from '../../../../components/investigation_status_badge/investigation_status_badge';
import { InvestigationTag } from '../../../../components/investigation_tag/investigation_tag';
import { useInvestigation } from '../../contexts/investigation_context';
import { AlertDetailsButton } from './alert_details_button';
import { ExternalIncidentButton } from './external_incident_button';

export function InvestigationHeader() {
  const { investigation } = useInvestigation();

  if (!investigation) {
    return null;
  }

  return (
    <EuiFlexGroup direction="column" gutterSize="m" alignItems="flexStart">
      <EuiFlexItem>
        <AlertDetailsButton />
      </EuiFlexItem>

      <EuiFlexItem>{investigation.title}</EuiFlexItem>

      <EuiFlexGroup direction="row" gutterSize="m" alignItems="center" wrap responsive={false}>
        <EuiFlexItem grow={false}>
          <InvestigationStatusBadge status={investigation.status} />
        </EuiFlexItem>

        {investigation.tags.length > 0 && (
          <EuiFlexItem grow={false}>
            <EuiFlexGroup responsive={false} wrap gutterSize="s">
              {investigation.tags.map((tag) => (
                <InvestigationTag key={tag} tag={tag} />
              ))}
            </EuiFlexGroup>
          </EuiFlexItem>
        )}

        <EuiFlexItem grow={false}>
          <EuiText size="s">
            <FormattedMessage
              id="xpack.investigateApp.investigationHeader.startedLabel"
              defaultMessage="Started: {timeAgo}"
              values={{
                timeAgo: <strong>{moment(investigation.createdAt).fromNow()}</strong>,
              }}
            />
          </EuiText>
        </EuiFlexItem>

        {!!investigation.externalIncidentUrl && (
          <EuiFlexItem grow={false}>
            <ExternalIncidentButton />
          </EuiFlexItem>
        )}
      </EuiFlexGroup>
    </EuiFlexGroup>
  );
}
