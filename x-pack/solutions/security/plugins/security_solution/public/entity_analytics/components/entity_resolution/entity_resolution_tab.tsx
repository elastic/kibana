/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import {
  EuiFlexGroup,
  EuiFlexItem,
  EuiHorizontalRule,
  EuiIcon,
  EuiPanel,
  EuiSpacer,
  EuiText,
  EuiTitle,
} from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n-react';
import { EntityResolutionFileUploader } from '../entity_resolution_file_uploader';

export const EntityResolutionTab: React.FC = () => {
  return (
    <EuiFlexGroup gutterSize="xl">
      <EuiFlexItem grow={3}>
        <EuiSpacer size="m" />
        <EuiText size="s">
          <FormattedMessage
            id="xpack.securitySolution.entityAnalytics.entityResolution.uploadDescription"
            defaultMessage="Bulk link entities to resolution targets by importing a CSV file. Each row uses identity fields to find matching entities and links them to a primary entity specified by its entity ID."
          />
        </EuiText>
        <EuiSpacer size="s" />
        <EntityResolutionFileUploader />
      </EuiFlexItem>
      <EuiFlexItem grow={2}>
        <WhatIsEntityResolutionPanel />
      </EuiFlexItem>
    </EuiFlexGroup>
  );
};

const WhatIsEntityResolutionPanel: React.FC = () => {
  return (
    <EuiPanel hasBorder paddingSize="l" grow={false}>
      <EuiText size="s">
        <FormattedMessage
          id="xpack.securitySolution.entityAnalytics.entityResolution.introText"
          defaultMessage="Use a CSV file to batch-link entity records that represent the same real-world identity. Aliases are matched by identity fields and linked to a primary entity."
        />
      </EuiText>
      <EuiSpacer size="l" />
      <EuiFlexGroup alignItems="center" gutterSize="s">
        <EuiIcon type="question" size="xl" aria-hidden />
        <EuiTitle size="xxs">
          <h3>
            <FormattedMessage
              id="xpack.securitySolution.entityAnalytics.entityResolution.whatIsTitle"
              defaultMessage="What is entity resolution?"
            />
          </h3>
        </EuiTitle>
      </EuiFlexGroup>
      <EuiSpacer size="s" />
      <EuiText size="s">
        <FormattedMessage
          id="xpack.securitySolution.entityAnalytics.entityResolution.whatIsDescription"
          defaultMessage="Entity resolution links multiple entity records that represent the same real-world identity across different data sources. For example, a user may appear as separate entities from Active Directory, Okta, and Entra ID. Resolution groups these aliases under a single primary entity, providing a unified view for risk scoring, investigation, and threat detection."
        />
      </EuiText>
      <EuiHorizontalRule />
      <EuiTitle size="xxs">
        <h4>
          <FormattedMessage
            id="xpack.securitySolution.entityAnalytics.entityResolution.csvFormatTitle"
            defaultMessage="CSV format"
          />
        </h4>
      </EuiTitle>
      <EuiSpacer size="xs" />
      <EuiText size="s">
        <FormattedMessage
          id="xpack.securitySolution.entityAnalytics.entityResolution.csvFormatDescription"
          defaultMessage="The CSV must include a header row with {type} and {resolvedTo} columns. Additional columns are identity fields (e.g., {email}, {name}) used as AND-combined filters to find matching entities."
          values={{
            type: <strong>{'type'}</strong>,
            resolvedTo: <strong>{'resolved_to'}</strong>,
            email: 'user.email',
            name: 'user.name',
          }}
        />
      </EuiText>
    </EuiPanel>
  );
};
