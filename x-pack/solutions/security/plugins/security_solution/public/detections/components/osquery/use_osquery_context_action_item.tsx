/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useMemo } from 'react';
import { getOsqueryActionItem } from './osquery_action_item';
import { useKibana } from '../../../common/lib/kibana';

interface IProps {
  handleClick: () => void;
}

export const useOsqueryContextActionItem = ({ handleClick }: IProps) => {
  const osqueryActionItem = useMemo(() => getOsqueryActionItem({ handleClick }), [handleClick]);
  const permissions = useKibana().services.application.capabilities.osquery;

  return {
    osqueryActionItems:
      permissions?.writeLiveQueries || permissions?.runSavedQueries ? [osqueryActionItem] : [],
  };
};
