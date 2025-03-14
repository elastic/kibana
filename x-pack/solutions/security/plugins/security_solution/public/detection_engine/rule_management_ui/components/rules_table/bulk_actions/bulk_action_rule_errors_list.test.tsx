/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { render, screen } from '@testing-library/react';
import React from 'react';
import {
  BulkActionTypeEnum,
  BulkActionsDryRunErrCodeEnum,
} from '../../../../../../common/api/detection_engine/rule_management';
import { TestProviders } from '../../../../../common/mock';
import { BulkActionRuleErrorsList } from './bulk_action_rule_errors_list';
import type { DryRunResult } from './types';

describe('Component BulkEditRuleErrorsList', () => {
  test('should not render component if no errors present', () => {
    const { container } = render(
      <BulkActionRuleErrorsList bulkAction={BulkActionTypeEnum.edit} ruleErrors={[]} />,
      {
        wrapper: TestProviders,
      }
    );

    expect(container.childElementCount).toEqual(0);
  });

  test('should render multiple error messages', () => {
    const ruleErrors: DryRunResult['ruleErrors'] = [
      {
        message: 'test failure',
        ruleIds: ['rule:1', 'rule:2'],
      },
      {
        message: 'another failure',
        ruleIds: ['rule:1'],
      },
    ];
    render(
      <BulkActionRuleErrorsList bulkAction={BulkActionTypeEnum.edit} ruleErrors={ruleErrors} />,
      {
        wrapper: TestProviders,
      }
    );

    expect(screen.getByText("2 rules can't be edited (test failure)")).toBeInTheDocument();
    expect(screen.getByText("1 rule can't be edited (another failure)")).toBeInTheDocument();
  });

  test.each([
    [
      BulkActionsDryRunErrCodeEnum.IMMUTABLE,
      '2 prebuilt Elastic rules (editing prebuilt rules is not supported)',
    ],
    [
      BulkActionsDryRunErrCodeEnum.MACHINE_LEARNING_INDEX_PATTERN,
      "2 machine learning rules (these rules don't have index patterns)",
    ],
    [
      BulkActionsDryRunErrCodeEnum.ESQL_INDEX_PATTERN,
      "2 ES|QL rules (these rules don't have index patterns)",
    ],
    [
      BulkActionsDryRunErrCodeEnum.MACHINE_LEARNING_AUTH,
      "2 machine learning rules can't be edited (test failure)",
    ],
    [undefined, "2 rules can't be edited (test failure)"],
  ])('should render correct message for "%s" errorCode', (errorCode, value) => {
    const ruleErrors: DryRunResult['ruleErrors'] = [
      {
        message: 'test failure',
        errorCode,
        ruleIds: ['rule:1', 'rule:2'],
      },
    ];
    render(
      <BulkActionRuleErrorsList bulkAction={BulkActionTypeEnum.edit} ruleErrors={ruleErrors} />,
      {
        wrapper: TestProviders,
      }
    );

    expect(screen.getByText(value)).toBeInTheDocument();
  });

  test.each([
    [
      BulkActionsDryRunErrCodeEnum.MANUAL_RULE_RUN_FEATURE,
      '2 rules (Manual rule run feature is disabled)',
    ],
    [
      BulkActionsDryRunErrCodeEnum.MANUAL_RULE_RUN_DISABLED_RULE,
      '2 rules (Cannot schedule manual rule run for disabled rules)',
    ],
  ])('should render correct message for "%s" errorCode', (errorCode, value) => {
    const ruleErrors: DryRunResult['ruleErrors'] = [
      {
        message: 'test failure',
        errorCode,
        ruleIds: ['rule:1', 'rule:2'],
      },
    ];
    render(
      <BulkActionRuleErrorsList bulkAction={BulkActionTypeEnum.run} ruleErrors={ruleErrors} />,
      {
        wrapper: TestProviders,
      }
    );

    expect(screen.getByText(value)).toBeInTheDocument();
  });
});
