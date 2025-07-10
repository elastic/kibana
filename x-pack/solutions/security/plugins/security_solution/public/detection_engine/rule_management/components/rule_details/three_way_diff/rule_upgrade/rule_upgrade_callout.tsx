/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiCallOut } from '@elastic/eui';
import { ActionRequiredBadge } from '../badges/action_required';
import { ReviewRequiredBadge } from '../badges/review_required_badge';
import { ReadyForUpgradeBadge } from '../badges/ready_for_upgrade_badge';
import * as i18n from './translations';

interface RuleUpgradeCalloutProps {
  numOfSolvableConflicts: number;
  numOfNonSolvableConflicts: number;
}

export function RuleUpgradeCallout({
  numOfSolvableConflicts,
  numOfNonSolvableConflicts,
}: RuleUpgradeCalloutProps): JSX.Element {
  if (numOfNonSolvableConflicts > 0) {
    return (
      <>
        <EuiCallOut
          title={
            <>
              <strong>{i18n.UPGRADE_STATUS}</strong>
              &nbsp;
              <ActionRequiredBadge />
              &nbsp;
              {i18n.RULE_HAS_CONFLICTS(numOfNonSolvableConflicts + numOfSolvableConflicts)}
            </>
          }
          color="danger"
          size="s"
        >
          <span>{i18n.RULE_HAS_HARD_CONFLICTS_DESCRIPTION}</span>
          <ul>
            <li>{i18n.RULE_HAS_HARD_CONFLICTS_KEEP_YOUR_CHANGES}</li>
            <li>{i18n.RULE_HAS_HARD_CONFLICTS_ACCEPT_ELASTIC_UPDATE}</li>
            <li>{i18n.RULE_HAS_HARD_CONFLICTS_EDIT_FINAL_VERSION}</li>
          </ul>
        </EuiCallOut>
      </>
    );
  }

  if (numOfSolvableConflicts > 0) {
    return (
      <>
        <EuiCallOut
          title={
            <>
              <strong>{i18n.UPGRADE_STATUS}</strong>
              &nbsp;
              <ReviewRequiredBadge />
              &nbsp;
              {i18n.RULE_HAS_CONFLICTS(numOfSolvableConflicts)}
            </>
          }
          color="warning"
          size="s"
        >
          <span>{i18n.RULE_HAS_SOFT_CONFLICTS_DESCRIPTION}</span>
          <ul>
            <li>{i18n.RULE_HAS_SOFT_CONFLICTS_ACCEPT_SUGGESTED_UPDATE}</li>
            <li>{i18n.RULE_HAS_SOFT_CONFLICTS_EDIT_FINAL_VERSION}</li>
          </ul>
        </EuiCallOut>
      </>
    );
  }

  return (
    <>
      <EuiCallOut
        title={
          <>
            <strong>{i18n.UPGRADE_STATUS}</strong>
            &nbsp;
            <ReadyForUpgradeBadge />
          </>
        }
        color="success"
        size="s"
      >
        <p>{i18n.RULE_IS_READY_FOR_UPGRADE_DESCRIPTION}</p>
      </EuiCallOut>
    </>
  );
}
