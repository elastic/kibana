/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useMemo } from 'react';
import type { RuleMigration } from '../../../../common/siem_migrations/model/rule_migration.gen';
import type { FilterOptions } from '../../../detection_engine/rule_management/logic/types';

export type TableFilterOptions = Pick<FilterOptions, 'filter'>;

export const useFilterRulesToInstall = ({
  ruleMigrations,
  filterOptions,
}: {
  ruleMigrations: RuleMigration[];
  filterOptions: TableFilterOptions;
}) => {
  const filteredRules = useMemo(() => {
    const { filter } = filterOptions;
    return ruleMigrations.filter((migration) => {
      const name = migration.elastic_rule?.title ?? migration.original_rule.title;
      if (filter && !name.toLowerCase().includes(filter.toLowerCase())) {
        return false;
      }
      return true;
    });
  }, [filterOptions, ruleMigrations]);

  return filteredRules;
};
