/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useMemo } from 'react';
import { useKibana } from '../../../../../common/lib/kibana';
import { ReprocessFailedItemsButton } from '../../../../common/components/bulk_actions';
import { WithMissingPrivilegesTooltip } from '../../../../common/components/missing_privileges';

export const useReprocessFailedButton = () => {
  const {
    services: { siemMigrations },
  } = useKibana();

  const reprocessButton = useMemo(() => {
    return WithMissingPrivilegesTooltip(ReprocessFailedItemsButton, siemMigrations.rules, 'all');
  }, [siemMigrations.rules]);

  return { reprocessButton };
};
