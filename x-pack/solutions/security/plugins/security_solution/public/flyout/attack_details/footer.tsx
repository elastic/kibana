/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useMemo } from 'react';
import { EuiFlyoutFooter } from '@elastic/eui';
import { buildDataTableRecord } from '@kbn/discover-utils';
import type { EsHitRecord } from '@kbn/discover-utils';
import { Footer } from '../../flyout_v2/attack/main/footer';
import { useAttackDetailsContext } from './context';
import { FLYOUT_FOOTER_TEST_ID } from './constants/test_ids';

export { FLYOUT_FOOTER_TEST_ID };

/**
 * Bottom section of the legacy attack details flyout. Delegates to the v2 Footer,
 * supplying props from context.
 */
export const PanelFooter = () => {
  const { attack, searchHit, refetch } = useAttackDetailsContext();

  const hit = useMemo(() => buildDataTableRecord(searchHit as EsHitRecord), [searchHit]);

  if (!attack) return null;

  return (
    <EuiFlyoutFooter data-test-subj={FLYOUT_FOOTER_TEST_ID}>
      <Footer attack={attack} hit={hit} onAttackUpdated={refetch} />
    </EuiFlyoutFooter>
  );
};

PanelFooter.displayName = 'PanelFooter';
