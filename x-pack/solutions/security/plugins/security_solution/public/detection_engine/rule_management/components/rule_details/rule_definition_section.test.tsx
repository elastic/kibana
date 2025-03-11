/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React from 'react';
import { render, screen } from '@testing-library/react';
import { RuleDefinitionSection } from './rule_definition_section';
import type {
  RuleResponse,
  AlertSuppressionMissingFieldsStrategy,
} from '../../../../../common/api/detection_engine/model/rule_schema';
import * as useAlertSuppressionMock from '../../logic/use_alert_suppression';
import * as useGetSavedQueryMock from '../../../../detections/pages/detection_engine/rules/use_get_saved_query';
import * as useUpsellingMessageMock from '../../../../common/hooks/use_upselling';
import {
  ALERT_SUPPRESSION_SUPPRESS_ON_MISSING_FIELDS,
  ALERT_SUPPRESSION_DO_NOT_SUPPRESS_ON_MISSING_FIELDS,
  ALERT_SUPPRESSION_PER_RULE_EXECUTION,
} from '../../../rule_creation_ui/components/description_step/translations';

jest.spyOn(useGetSavedQueryMock, 'useGetSavedQuery').mockReturnValue({
  isSavedQueryLoading: false,
  savedQueryBar: {
    saved_id: 'id',
    filters: [],
    query: {
      query: 'query',
      language: 'kquery',
    },
    title: 'title',
  },
  savedQuery: undefined,
});
jest
  .spyOn(useUpsellingMessageMock, 'useUpsellingMessage')
  .mockReturnValue(
    'Alert suppression is configured but will not be applied due to insufficient licensing'
  );

describe('RuleDefinitionSection', () => {
  describe('Alert Suppression', () => {
    beforeEach(() => {
      jest.clearAllMocks();
    });

    test('should display all suppression fields when the rule contains alert_suppression with all properties similar to a query rule', () => {
      jest
        .spyOn(useAlertSuppressionMock, 'useAlertSuppression')
        .mockReturnValueOnce({ isSuppressionEnabled: true });
      const rule: Partial<RuleResponse> = {
        alert_suppression: {
          group_by: ['field1', 'field2'],
          duration: { value: 2, unit: 'h' },
          missing_fields_strategy: 'suppress' as AlertSuppressionMissingFieldsStrategy,
        },
      };

      render(<RuleDefinitionSection rule={rule} />);

      expect(screen.getByTestId('alertSuppressionGroupByPropertyTitle')).toBeInTheDocument();
      expect(screen.getByTestId('alertSuppressionDurationPropertyTitle')).toBeInTheDocument();
      expect(screen.getByTestId('alertSuppressionMissingFieldPropertyTitle')).toBeInTheDocument();
      expect(screen.getByTestId('alertSuppressionGroupByPropertyValue')).toHaveTextContent(
        'field1field2'
      );
      expect(screen.getByTestId('alertSuppressionDurationPropertyValue')).toHaveTextContent('2h');
      expect(screen.getByTestId('alertSuppressionMissingFieldsPropertyValue')).toHaveTextContent(
        ALERT_SUPPRESSION_SUPPRESS_ON_MISSING_FIELDS
      );
    });
    test('should display the suppression duration correctly when it runs per rule execution', () => {
      jest
        .spyOn(useAlertSuppressionMock, 'useAlertSuppression')
        .mockReturnValueOnce({ isSuppressionEnabled: true });
      const rule: Partial<RuleResponse> = {
        alert_suppression: {
          group_by: ['field1', 'field2'],
          missing_fields_strategy: 'suppress' as AlertSuppressionMissingFieldsStrategy,
        },
      };

      render(<RuleDefinitionSection rule={rule} />);

      expect(screen.getByTestId('alertSuppressionGroupByPropertyTitle')).toBeInTheDocument();
      expect(screen.getByTestId('alertSuppressionDurationPropertyTitle')).toBeInTheDocument();
      expect(screen.getByTestId('alertSuppressionMissingFieldPropertyTitle')).toBeInTheDocument();
      expect(screen.getByTestId('alertSuppressionGroupByPropertyValue')).toHaveTextContent(
        'field1field2'
      );
      expect(screen.getByTestId('alertSuppressionDurationPropertyValue')).toHaveTextContent(
        ALERT_SUPPRESSION_PER_RULE_EXECUTION
      );
      expect(screen.getByTestId('alertSuppressionMissingFieldsPropertyValue')).toHaveTextContent(
        ALERT_SUPPRESSION_SUPPRESS_ON_MISSING_FIELDS
      );
    });

    test('should render only AlertSuppressionTitle and SuppressAlertsDuration when rule type does not have group_by field like threshold', () => {
      jest
        .spyOn(useAlertSuppressionMock, 'useAlertSuppression')
        .mockReturnValueOnce({ isSuppressionEnabled: true });
      const rule: Partial<RuleResponse> = {
        alert_suppression: {
          duration: { value: 2, unit: 'm' },
          missing_fields_strategy: 'doNotSuppress' as AlertSuppressionMissingFieldsStrategy,
        },
      };

      render(<RuleDefinitionSection rule={rule} />);

      expect(screen.queryByTestId('alertSuppressionGroupByPropertyTitle')).not.toBeInTheDocument();
      expect(screen.getByTestId('alertSuppressionMissingFieldPropertyTitle')).toBeInTheDocument();
      expect(screen.getByTestId('alertSuppressionDurationPropertyValue')).toHaveTextContent('2m');
      expect(screen.getByTestId('alertSuppressionMissingFieldsPropertyValue')).toHaveTextContent(
        ALERT_SUPPRESSION_DO_NOT_SUPPRESS_ON_MISSING_FIELDS
      );
    });

    test('does not render suppression fields when isSuppressionEnabled is false', () => {
      const rule: Partial<RuleResponse> = {
        alert_suppression: {
          group_by: ['field1', 'field2'],
          duration: { value: 2, unit: 'h' },
          missing_fields_strategy: 'doNotSuppress' as AlertSuppressionMissingFieldsStrategy,
        },
      };

      jest
        .spyOn(useAlertSuppressionMock, 'useAlertSuppression')
        .mockReturnValueOnce({ isSuppressionEnabled: false });

      render(<RuleDefinitionSection rule={rule} />);

      expect(screen.queryByTestId('alertSuppressionGroupByPropertyTitle')).not.toBeInTheDocument();
      expect(screen.queryByTestId('alertSuppressionDurationPropertyTitle')).not.toBeInTheDocument();
      expect(
        screen.queryByTestId('alertSuppressionMissingFieldPropertyTitle')
      ).not.toBeInTheDocument();
    });

    test('does not render suppression fields when alert_suppression property is not present in the rule', () => {
      const rule: Partial<RuleResponse> = {};

      jest
        .spyOn(useAlertSuppressionMock, 'useAlertSuppression')
        .mockReturnValueOnce({ isSuppressionEnabled: true });

      render(<RuleDefinitionSection rule={rule} />);

      expect(screen.queryByTestId('alertSuppressionGroupByPropertyTitle')).not.toBeInTheDocument();
      expect(screen.queryByTestId('alertSuppressionDurationPropertyTitle')).not.toBeInTheDocument();
      expect(
        screen.queryByTestId('alertSuppressionMissingFieldPropertyTitle')
      ).not.toBeInTheDocument();
    });
  });
});
