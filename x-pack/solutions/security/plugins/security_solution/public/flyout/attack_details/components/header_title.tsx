/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { memo } from 'react';
import { FlyoutTitle } from '../../shared/components/flyout_title';
import { useAttackDetailsContext } from '../context';
import { getField } from '../../document_details/shared/utils';

export const HEADER_TITLE_TEST_ID = 'attack-details-flyout-header-title';
const FIELD_ATTACK_TITLE = 'kibana.alert.attack_discovery.title';

/**
 * Header data for the Attack details flyout
 */
export const HeaderTitle = memo(() => {
  const { getFieldsData } = useAttackDetailsContext();

  const title = getField(getFieldsData(FIELD_ATTACK_TITLE)) ?? '';

  return <FlyoutTitle data-test-subj={HEADER_TITLE_TEST_ID} title={title} iconType={'warning'} />;
});

HeaderTitle.displayName = 'HeaderTitle';
