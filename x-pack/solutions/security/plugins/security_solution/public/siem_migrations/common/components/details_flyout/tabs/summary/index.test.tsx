/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render } from '@testing-library/react';
import { SummaryTabBase } from '.';
import {
  getAssistantComment,
  getUserComment,
} from '../../../../../../../common/siem_migrations/model/__mocks__';
import { useKibana } from '../../../../../../common/lib/kibana';
import { createStartServicesMock } from '../../../../../../common/lib/kibana/kibana_react.mock';
import { useBulkGetUserProfiles } from '../../../../../../common/components/user_profiles/use_bulk_get_user_profiles';
import { getMockUserProfile } from '../../../__mocks__';
import { SIEM_MIGRATIONS_ASSISTANT_USER } from '../../../../../../../common/siem_migrations/constants';

jest.mock('../../../../../../common/lib/kibana');
jest.mock('../../../../../../common/components/user_profiles/use_bulk_get_user_profiles');

describe('SummaryTabBase', () => {
  const userUuid = 'test-user-1';

  beforeEach(() => {
    (useKibana as jest.Mock).mockReturnValue({
      services: {
        ...createStartServicesMock(),
      },
    });

    (useBulkGetUserProfiles as jest.Mock).mockReturnValue({
      isLoading: false,
      data: [getMockUserProfile({ uid: userUuid })],
    });
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('renders the comments', () => {
    const { getByText } = render(
      <SummaryTabBase
        comments={[getUserComment({ created_by: userUuid })]}
        getEventDetails={() => 'event details'}
      />
    );
    expect(getByText('User says hi')).toBeInTheDocument();
  });

  it('renders the event details', () => {
    const { getByText } = render(
      <SummaryTabBase
        comments={[getUserComment({ created_by: userUuid }), getAssistantComment()]}
        getEventDetails={(comment) => {
          return comment.created_by === SIEM_MIGRATIONS_ASSISTANT_USER
            ? 'assistant event details'
            : 'user event details';
        }}
      />
    );
    expect(getByText('user event details')).toBeInTheDocument();
    expect(getByText('assistant event details')).toBeInTheDocument();
  });
});
