/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { paramContainsSpace, autoCompletei18n } from '@kbn/securitysolution-autocomplete';

interface UseValueWithSpaceWarningResult {
  showSpaceWarningIcon: boolean;
  warningText: string;
}
interface UseValueWithSpaceWarningProps {
  value: string | string[];
  tooltipIconText?: string;
}

export const useValueWithSpaceWarning = ({
  value,
  tooltipIconText,
}: UseValueWithSpaceWarningProps): UseValueWithSpaceWarningResult => {
  const showSpaceWarningIcon = Array.isArray(value)
    ? value.find(paramContainsSpace)
    : paramContainsSpace(value);

  return {
    showSpaceWarningIcon: !!showSpaceWarningIcon,
    warningText: tooltipIconText || autoCompletei18n.FIELD_SPACE_WARNING,
  };
};
