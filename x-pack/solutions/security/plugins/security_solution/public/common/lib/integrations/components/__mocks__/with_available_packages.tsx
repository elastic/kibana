/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React from 'react';
import type { IntegrationCardItem } from '@kbn/fleet-plugin/public';

export const getDefaultAvailablePackages = () => ({
  initialSelectedCategory: '',
  selectedCategory: '',
  setCategory: jest.fn(),
  allCategories: [],
  mainCategories: [],
  availableSubCategories: [],
  selectedSubCategory: '',
  setSelectedSubCategory: jest.fn(),
  searchTerm: '',
  setSearchTerm: jest.fn(),
  setUrlandPushHistory: jest.fn(),
  setUrlandReplaceHistory: jest.fn(),
  preference: '',
  setPreference: jest.fn(),
  isLoading: false,
  isLoadingCategories: false,
  isLoadingAllPackages: false,
  isLoadingAppendCustomIntegrations: false,
  eprPackageLoadingError: null,
  eprCategoryLoadingError: null,
  filteredCards: [] as IntegrationCardItem[],
});

export const mockAvailablePackages = jest.fn(() => getDefaultAvailablePackages());

export const withAvailablePackages = jest.fn(
  (Component: React.ComponentType<{ availablePackages: unknown }>) =>
    function WithAvailablePackages(props: object) {
      return (
        <div data-test-subj="withAvailablePackages">
          <Component
            {...{
              ...props,
              availablePackages: mockAvailablePackages(),
            }}
          />
        </div>
      );
    }
);
