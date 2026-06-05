/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiCallOut, EuiSpacer, EuiText } from '@elastic/eui';
import { useBirthdaysToday } from '../../../rule_management/logic/use_birthdays_today';
import {
  BIRTHDAYS_CARD_TITLE,
  BIRTHDAYS_CARD_NONE,
  birthdaysCardSummary,
  birthdaysCardRuleLine,
  birthdaysCardMoreLine,
} from './translations';

const MAX_NAMES_TO_PREVIEW = 5;

export const BirthdaysCard = React.memo(() => {
  const { data, isLoading } = useBirthdaysToday({});

  if (isLoading || !data) {
    return null;
  }

  const details = data.celebrating_rules_details;
  const total = data.total;

  if (total === 0) {
    return (
      <>
        <EuiCallOut
          announceOnMount
          data-test-subj="rule-birthdays-card"
          title={BIRTHDAYS_CARD_TITLE}
          color="primary"
          size="m"
        >
          <EuiText size="s">{BIRTHDAYS_CARD_NONE}</EuiText>
        </EuiCallOut>
        <EuiSpacer size="m" />
      </>
    );
  }

  const preview = details.slice(0, MAX_NAMES_TO_PREVIEW);

  return (
    <>
      <EuiCallOut
        data-test-subj="rule-birthdays-card"
        title={BIRTHDAYS_CARD_TITLE}
        color="success"
        size="m"
      >
        <EuiText size="s">
          <p>{birthdaysCardSummary(total)}</p>
          <ul>
            {preview.map((rule) => (
              <li key={rule.id}>
                {birthdaysCardRuleLine({
                  name: rule.name,
                  ageYears: rule.ageYears,
                  alertTypeId: rule.alertTypeId,
                  createdBy: rule.createdBy,
                  createdDate: rule.createdAt.slice(0, 10),
                  birthdayMessage: rule.birthdayMessage,
                })}
              </li>
            ))}
            {total > MAX_NAMES_TO_PREVIEW ? (
              <li>{birthdaysCardMoreLine(total - MAX_NAMES_TO_PREVIEW)}</li>
            ) : null}
          </ul>
        </EuiText>
      </EuiCallOut>
      <EuiSpacer size="m" />
    </>
  );
});

BirthdaysCard.displayName = 'BirthdaysCard';
