/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { ReactElement } from 'react';
import { generateLinkedRulesMenuItems } from '../generate_linked_rules_menu_item';
import { rules } from './rule_references.mock';
export const securityLinkAnchorComponentMock = ({
  referenceName,
  referenceId,
}: {
  referenceName: string;
  referenceId: string;
}) => (
  <div data-test-subj="securityLinkAnchorComponent">
    <a href={referenceId}>{referenceName}</a>
  </div>
);

export const getSecurityLinkAction = (dataTestSubj: string) =>
  generateLinkedRulesMenuItems({
    dataTestSubj,
    linkedRules: [
      ...rules,
      {
        exceptions_list: [],
        id: '2a2b3c',
        name: 'Simple Rule Query 2',
        rule_id: 'rule-2',
      },
    ],
    securityLinkAnchorComponent: securityLinkAnchorComponentMock,
  }) as ReactElement[];
