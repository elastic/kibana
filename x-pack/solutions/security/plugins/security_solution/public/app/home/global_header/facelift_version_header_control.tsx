/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { i18n } from '@kbn/i18n';

import {
  FACELIFT_VERSION_OPTIONS,
  useActiveFaceliftVersion,
} from '../../../entity_analytics/components/home/facelift/active_version';
import { FaceliftHeaderVersionSelect } from './facelift_header_version_select';

const LABEL = i18n.translate('xpack.securitySolution.globalHeader.faceliftPrototypeVersionLabel', {
  defaultMessage: 'Prototype version:',
});

const SELECT_ARIA_LABEL = i18n.translate(
  'xpack.securitySolution.globalHeader.faceliftPrototypeVersionAriaLabel',
  { defaultMessage: 'Prototype version' }
);

/**
 * Single-select prototype version control for the Kibana chrome header
 * (shown left of Add integrations on Entity analytics home).
 */
export const FaceliftVersionHeaderControl: React.FC = () => {
  const [faceliftVersion, setFaceliftVersion] = useActiveFaceliftVersion();

  return (
    <FaceliftHeaderVersionSelect
      label={LABEL}
      ariaLabel={SELECT_ARIA_LABEL}
      options={FACELIFT_VERSION_OPTIONS}
      value={faceliftVersion}
      onChange={setFaceliftVersion}
      testIdPrefix="eaFaceliftVersion"
    />
  );
};
