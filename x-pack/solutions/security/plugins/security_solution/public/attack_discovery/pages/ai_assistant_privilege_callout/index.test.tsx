/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { render, screen } from '@testing-library/react';
import React from 'react';

import {
  AI_ASSISTANT_PRIVILEGE_CALLOUT_TEST_SUBJ,
  AiAssistantPrivilegeCallout,
} from '.';
import * as i18n from '../../ai_privilege_translations';

describe('AiAssistantPrivilegeCallout', () => {
  it('renders the callout with the expected title and body', () => {
    render(<AiAssistantPrivilegeCallout />);

    expect(screen.getByTestId(AI_ASSISTANT_PRIVILEGE_CALLOUT_TEST_SUBJ)).toBeInTheDocument();
    expect(screen.getByText(i18n.NO_AI_ASSISTANT_PRIVILEGE_CALLOUT_TITLE)).toBeInTheDocument();
    expect(screen.getByText(i18n.NO_AI_ASSISTANT_PRIVILEGE_CALLOUT_BODY)).toBeInTheDocument();
  });
});
