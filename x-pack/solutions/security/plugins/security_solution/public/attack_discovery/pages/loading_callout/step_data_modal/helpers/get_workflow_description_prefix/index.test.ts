/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { getWorkflowDescriptionPrefix } from '.';

import * as i18n from '../../translations';

describe('getWorkflowDescriptionPrefix', () => {
  describe('when dataType is "discoveries"', () => {
    it('returns the counted message when dataCount is known', () => {
      const result = getWorkflowDescriptionPrefix(3, 'discoveries');

      expect(result).toBe(i18n.N_DISCOVERIES_GENERATED_BY_WORKFLOW(3));
    });

    it('returns the generic message when dataCount is null', () => {
      const result = getWorkflowDescriptionPrefix(null, 'discoveries');

      expect(result).toBe(i18n.DISCOVERIES_GENERATED_BY_WORKFLOW);
    });
  });

  describe('when dataType is "validated_discoveries"', () => {
    it('returns the counted message when dataCount is known', () => {
      const result = getWorkflowDescriptionPrefix(5, 'validated_discoveries');

      expect(result).toBe(i18n.N_DISCOVERIES_VALIDATED_BY_WORKFLOW(5));
    });

    it('returns the generic message when dataCount is null', () => {
      const result = getWorkflowDescriptionPrefix(null, 'validated_discoveries');

      expect(result).toBe(i18n.DISCOVERIES_VALIDATED_BY_WORKFLOW);
    });
  });

  describe('when dataType is "alerts"', () => {
    it('returns the counted message when dataCount is known', () => {
      const result = getWorkflowDescriptionPrefix(10, 'alerts');

      expect(result).toBe(i18n.N_ALERTS_FROM_WORKFLOW(10));
    });

    it('returns the generic message when dataCount is null', () => {
      const result = getWorkflowDescriptionPrefix(null, 'alerts');

      expect(result).toBe(i18n.ALERTS_FROM_WORKFLOW);
    });
  });

  describe('when dataCount is 0', () => {
    it('returns the counted message (not the generic one)', () => {
      const result = getWorkflowDescriptionPrefix(0, 'alerts');

      expect(result).toBe(i18n.N_ALERTS_FROM_WORKFLOW(0));
    });
  });

  describe('ICU plural for the alerts count message', () => {
    it('uses the singular "alert" for a count of 1', () => {
      const result = getWorkflowDescriptionPrefix(1, 'alerts');

      expect(result).toBe('1 alert from workflow');
    });

    it('uses the plural "alerts" for a count of 2', () => {
      const result = getWorkflowDescriptionPrefix(2, 'alerts');

      expect(result).toBe('2 alerts from workflow');
    });
  });
});
