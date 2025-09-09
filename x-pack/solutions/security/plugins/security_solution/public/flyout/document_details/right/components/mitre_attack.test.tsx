/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { act, render } from '@testing-library/react';
import { MitreAttack } from './mitre_attack';
import { DocumentDetailsContext } from '../../shared/context';
import { MITRE_ATTACK_DETAILS_TEST_ID, MITRE_ATTACK_TITLE_TEST_ID } from './test_ids';
import { mockSearchHit } from '../../shared/mocks/mock_search_hit';

const renderMitreAttack = (contextValue: DocumentDetailsContext) =>
  render(
    <DocumentDetailsContext.Provider value={contextValue}>
      <MitreAttack />
    </DocumentDetailsContext.Provider>
  );

describe('<MitreAttack />', () => {
  it('should render mitre attack information (in array form)', async () => {
    const contextValue = { searchHit: mockSearchHit } as unknown as DocumentDetailsContext;

    const { getByTestId } = renderMitreAttack(contextValue);

    await act(async () => {
      expect(getByTestId(MITRE_ATTACK_TITLE_TEST_ID)).toBeInTheDocument();
      expect(getByTestId(MITRE_ATTACK_DETAILS_TEST_ID)).toBeInTheDocument();
    });
  });

  it('should render mitre attack information (in object form)', async () => {
    const contextValue = {
      searchHit: {
        _index: 'index',
        _id: 'id',
        fields: {
          'kibana.alert.rule.parameters': [
            {
              threat: {
                framework: 'MITRE ATT&CK',
                tactic: {
                  id: '123',
                  reference: 'https://attack.mitre.org/tactics/123',
                  name: 'Tactic',
                },
                technique: [
                  {
                    id: '456',
                    reference: 'https://attack.mitre.org/techniques/456',
                    name: 'Technique',
                  },
                ],
              },
            },
          ],
        },
      },
    } as unknown as DocumentDetailsContext;

    const { getByTestId } = renderMitreAttack(contextValue);

    await act(async () => {
      expect(getByTestId(MITRE_ATTACK_TITLE_TEST_ID)).toBeInTheDocument();
      expect(getByTestId(MITRE_ATTACK_DETAILS_TEST_ID)).toBeInTheDocument();
    });
  });

  it('should render empty component if missing mitre attack value', async () => {
    const contextValue = {
      searchHit: {
        some_field: 'some_value',
      },
    } as unknown as DocumentDetailsContext;

    const { container } = renderMitreAttack(contextValue);

    await act(async () => {
      expect(container).toBeEmptyDOMElement();
    });
  });
});
