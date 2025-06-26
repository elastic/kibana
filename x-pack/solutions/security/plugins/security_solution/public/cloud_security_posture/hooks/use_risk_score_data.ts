/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useMemo } from 'react';
import {
  type HostRiskScore,
  type UserRiskScore,
  buildHostNamesFilter,
  buildUserNamesFilter,
} from '../../../common/search_strategy';
import { useRiskScore } from '../../entity_analytics/api/hooks/use_risk_score';
import { FIRST_RECORD_PAGINATION } from '../../entity_analytics/common';
import { EntityType } from '../../../common/entity_analytics/types';
import type { CloudPostureEntityIdentifier } from '../components/entity_insight';

export const useHasRiskScore = ({
  field,
  value,
}: {
  field: CloudPostureEntityIdentifier;
  value: string;
}) => {
  const isHostNameField = field === 'host.name';
  const buildFilterQuery = useMemo(
    () => (isHostNameField ? buildHostNamesFilter([value]) : buildUserNamesFilter([value])),
    [isHostNameField, value]
  );
  const { data } = useRiskScore({
    riskEntity: isHostNameField ? EntityType.host : EntityType.user,
    filterQuery: buildFilterQuery,
    onlyLatest: false,
    pagination: FIRST_RECORD_PAGINATION,
  });

  const riskData = data?.[0];

  const hasRiskScore = isHostNameField
    ? !!(riskData as HostRiskScore)?.host.risk
    : !!(riskData as UserRiskScore)?.user.risk;

  return { hasRiskScore };
};
