/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render } from '@testing-library/react';
import type { DataTableRecord } from '@kbn/discover-utils';
import { MitreAttack } from './mitre_attack';
import { MITRE_ATTACK_DETAILS_TEST_ID, MITRE_ATTACK_TITLE_TEST_ID } from './test_ids';

const createMockHit = (flattened: DataTableRecord['flattened']): DataTableRecord =>
  ({
    id: '1',
    raw: {},
    flattened,
    isAnchor: false,
  } as DataTableRecord);

const renderMitreAttack = (hit: DataTableRecord) => render(<MitreAttack hit={hit} />);

describe('<MitreAttack />', () => {
  it('should render mitre attack information (in array form)', () => {
    const hit = createMockHit({
      'kibana.alert.rule.parameters': [
        {
          threat: [
            {
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
          ],
        },
      ],
    });

    const { getByTestId } = renderMitreAttack(hit);

    expect(getByTestId(MITRE_ATTACK_TITLE_TEST_ID)).toBeInTheDocument();
    expect(getByTestId(MITRE_ATTACK_DETAILS_TEST_ID)).toBeInTheDocument();
  });

  it('should render mitre attack information (in object form)', () => {
    const hit = createMockHit({
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
    });

    const { getByTestId } = renderMitreAttack(hit);

    expect(getByTestId(MITRE_ATTACK_TITLE_TEST_ID)).toBeInTheDocument();
    expect(getByTestId(MITRE_ATTACK_DETAILS_TEST_ID)).toBeInTheDocument();
  });

  it('should render mitre attack information from JSON string (timeline data)', () => {
    const hit = createMockHit({
      'kibana.alert.rule.parameters': JSON.stringify({
        threat: [
          {
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
        ],
      }),
    });

    const { getByTestId } = renderMitreAttack(hit);

    expect(getByTestId(MITRE_ATTACK_TITLE_TEST_ID)).toBeInTheDocument();
    expect(getByTestId(MITRE_ATTACK_DETAILS_TEST_ID)).toBeInTheDocument();
  });

  it('should render empty component if missing mitre attack value', () => {
    const hit = createMockHit({
      some_field: 'some_value',
    });

    const { container } = renderMitreAttack(hit);

    expect(container).toBeEmptyDOMElement();
  });
});
