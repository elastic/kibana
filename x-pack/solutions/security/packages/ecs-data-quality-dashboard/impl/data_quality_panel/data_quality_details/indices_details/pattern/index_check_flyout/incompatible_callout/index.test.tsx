/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EcsVersion } from '@elastic/ecs';
import { render, screen } from '@testing-library/react';
import React from 'react';

import { TestExternalProviders } from '../../../../../mock/test_providers/test_providers';
import { IncompatibleCallout } from '.';
import {
  DETECTION_ENGINE_RULES_MAY_NOT_MATCH,
  MAPPINGS_THAT_CONFLICT_WITH_ECS,
  PAGES_MAY_NOT_DISPLAY_EVENTS,
} from '../../../../../translations';

describe('IncompatibleCallout', () => {
  it('should warn rules may not match', () => {
    render(
      <TestExternalProviders>
        <IncompatibleCallout />
      </TestExternalProviders>
    );
    expect(screen.getByTestId('rulesMayNotMatch')).toHaveTextContent(
      DETECTION_ENGINE_RULES_MAY_NOT_MATCH
    );
  });

  it('should warn pages may not display events', () => {
    render(
      <TestExternalProviders>
        <IncompatibleCallout />
      </TestExternalProviders>
    );
    expect(screen.getByTestId('pagesMayNotDisplayEvents')).toHaveTextContent(
      PAGES_MAY_NOT_DISPLAY_EVENTS
    );
  });

  it("should warn mappings that don't comply with ECS are unsupported", () => {
    render(
      <TestExternalProviders>
        <IncompatibleCallout />
      </TestExternalProviders>
    );
    expect(screen.getByTestId('mappingsThatDontComply')).toHaveTextContent(
      MAPPINGS_THAT_CONFLICT_WITH_ECS
    );
  });

  describe('given an incompatible field count', () => {
    it('should include the count in the title', () => {
      render(
        <TestExternalProviders>
          <IncompatibleCallout incompatibleFieldCount={3} />
        </TestExternalProviders>
      );
      expect(screen.getByTestId('incompatibleCallout')).toHaveTextContent('3 incompatible fields');
    });
  });

  describe('given no incompatible field count', () => {
    it('should not include the count in the title', () => {
      render(
        <TestExternalProviders>
          <IncompatibleCallout />
        </TestExternalProviders>
      );
      expect(screen.getByTestId('incompatibleCallout')).not.toHaveTextContent(
        '3 incompatible fields'
      );
    });
  });

  describe('given an ECS version', () => {
    it('should include the provided ECS version in the main content', () => {
      render(
        <TestExternalProviders>
          <IncompatibleCallout ecsVersion="1.8.0" />
        </TestExternalProviders>
      );
      expect(screen.getByTestId('fieldsAreIncompatible')).toHaveTextContent(
        `Fields are incompatible with ECS when index mappings, or the values of the fields in the index, don't conform to the Elastic Common Schema (ECS), version 1.8.0.`
      );
    });
  });

  describe('given no ECS version', () => {
    it('should include the default ECS version in the main content', () => {
      render(
        <TestExternalProviders>
          <IncompatibleCallout />
        </TestExternalProviders>
      );
      expect(screen.getByTestId('fieldsAreIncompatible')).toHaveTextContent(
        `Fields are incompatible with ECS when index mappings, or the values of the fields in the index, don't conform to the Elastic Common Schema (ECS), version ${EcsVersion}.`
      );
    });
  });
});
