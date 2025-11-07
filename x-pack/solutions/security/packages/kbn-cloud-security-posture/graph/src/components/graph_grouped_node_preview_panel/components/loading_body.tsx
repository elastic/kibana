/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { type FC } from 'react';
import { i18n } from '@kbn/i18n';
import { PanelBody, List } from '../styles';
import { i18nNamespaceKey } from '../constants';
import { LOADING_BODY_TEST_ID } from '../test_ids';
import { Title } from './title';
import { ListHeader } from './list_header';
import { GroupedItem } from './grouped_item/grouped_item';

const loadingItems = i18n.translate(`${i18nNamespaceKey}.loadingItems`, {
  defaultMessage: 'Loading group items...',
});

const groupItems = i18n.translate(`${i18nNamespaceKey}.items`, {
  defaultMessage: 'Items',
});

export type LoadingBodyProps = void;

export const LoadingBody: FC = () => (
  <PanelBody data-test-subj={LOADING_BODY_TEST_ID}>
    <Title icon="index" text={loadingItems} />
    <ListHeader groupedItemsType={groupItems} />
    <List>
      <GroupedItem isLoading />
      <GroupedItem isLoading />
      <GroupedItem isLoading />
    </List>
  </PanelBody>
);
