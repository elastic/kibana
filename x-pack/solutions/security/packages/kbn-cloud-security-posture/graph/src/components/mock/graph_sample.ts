/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { NodeViewModel, EdgeViewModel } from '../types';

export const basicSample = {
  nodes: [
    {
      id: 'A',
      label: 'A',
      color: 'primary',
      shape: 'hexagon',
      icon: 'user',
    },
    {
      id: 'B',
      label: 'B',
      color: 'primary',
      shape: 'hexagon',
      icon: 'user',
    },
    {
      id: 'a(A)-b(B)label(IndividualLabel)',
      label: 'IndividualLabel',
      source: 'A',
      target: 'B',
      color: 'primary',
      shape: 'label',
    },
  ] as NodeViewModel[],
  edges: [
    {
      id: 'a(A)-b(a(A)-b(B)label(IndividualLabel))',
      source: 'A',
      sourceShape: 'hexagon',
      target: 'a(A)-b(B)label(IndividualLabel)',
      targetShape: 'label',
      color: 'primary',
    },
    {
      id: 'a(a(A)-b(B)label(IndividualLabel))-b(B)',
      source: 'a(A)-b(B)label(IndividualLabel)',
      sourceShape: 'label',
      target: 'B',
      targetShape: 'hexagon',
      color: 'primary',
    },
  ] as EdgeViewModel[],
};

export const graphSample = {
  nodes: [
    {
      id: 'A',
      label: 'A',
      color: 'danger',
      shape: 'hexagon',
      icon: 'user',
    },
    {
      id: 'B',
      label: 'B',
      color: 'danger',
      shape: 'hexagon',
      icon: 'user',
    },
    {
      id: 'C',
      label: 'C',
      color: 'primary',
      shape: 'hexagon',
      icon: 'user',
    },
    {
      id: 'D',
      label: 'D',
      color: 'primary',
      shape: 'rectangle',
      icon: 'storage',
    },
    {
      id: 'E',
      label: 'E',
      color: 'primary',
      shape: 'rectangle',
      icon: 'storage',
    },
    {
      id: 'a(A)-b(B)label(IndividualLabel)',
      label: 'IndividualLabel',
      source: 'A',
      target: 'B',
      color: 'danger',
      shape: 'label',
    },
    {
      id: 'grp(a(B)-b(C))',
      shape: 'group',
    },
    {
      id: 'a(B)-b(C)label(StackedLabel1)',
      label: 'StackedLabel1',
      source: 'B',
      target: 'C',
      color: 'primary',
      shape: 'label',
      parentId: 'grp(a(B)-b(C))',
    },
    {
      id: 'a(B)-b(C)label(StackedLabel2)',
      label: 'StackedLabel2',
      source: 'B',
      target: 'C',
      color: 'primary',
      shape: 'label',
      parentId: 'grp(a(B)-b(C))',
    },
    {
      id: 'a(A)-b(D)rel(Owns)',
      label: 'Owns',
      shape: 'relationship',
    },
    {
      id: 'a(A)-b(E)rel(Communicates_with)',
      label: 'Communicates with',
      shape: 'relationship',
    },
  ] as NodeViewModel[],
  edges: [
    {
      id: 'a(A)-b(a(A)-b(B)label(IndividualLabel))',
      source: 'A',
      sourceShape: 'hexagon',
      target: 'a(A)-b(B)label(IndividualLabel)',
      targetShape: 'label',
      color: 'danger',
    },
    {
      id: 'a(a(A)-b(B)label(IndividualLabel))-b(B)',
      source: 'a(A)-b(B)label(IndividualLabel)',
      sourceShape: 'label',
      target: 'B',
      targetShape: 'hexagon',
      color: 'danger',
    },
    {
      id: 'a(B)-b(grp(a(B)-b(C)))',
      source: 'B',
      sourceShape: 'hexagon',
      target: 'grp(a(B)-b(C))',
      targetShape: 'group',
      color: 'primary',
    },
    {
      id: 'a(grp(a(B)-b(C)))-b(C)',
      source: 'grp(a(B)-b(C))',
      sourceShape: 'group',
      target: 'C',
      targetShape: 'hexagon',
      color: 'primary',
    },
    {
      id: 'a(grp(a(B)-b(C)))-b(a(B)-b(C)label(StackedLabel1))',
      source: 'grp(a(B)-b(C))',
      sourceShape: 'group',
      target: 'a(B)-b(C)label(StackedLabel1)',
      targetShape: 'label',
      color: 'primary',
    },
    {
      id: 'a(a(B)-b(C)label(StackedLabel1))-b(grp(a(B)-b(C)))',
      source: 'a(B)-b(C)label(StackedLabel1)',
      sourceShape: 'label',
      target: 'grp(a(B)-b(C))',
      targetShape: 'group',
      color: 'primary',
    },
    {
      id: 'a(grp(a(B)-b(C)))-b(a(B)-b(C)label(StackedLabel2))',
      source: 'grp(a(B)-b(C))',
      sourceShape: 'group',
      target: 'a(B)-b(C)label(StackedLabel2)',
      targetShape: 'label',
      color: 'primary',
    },
    {
      id: 'a(a(B)-b(C)label(StackedLabel2))-b(grp(a(B)-b(C)))',
      source: 'a(B)-b(C)label(StackedLabel2)',
      sourceShape: 'label',
      target: 'grp(a(B)-b(C))',
      targetShape: 'group',
      color: 'primary',
    },
    {
      id: 'a(A)-b(a(A)-b(D)rel(Owns))',
      source: 'A',
      sourceShape: 'hexagon',
      target: 'a(A)-b(D)rel(Owns)',
      targetShape: 'relationship',
      color: 'subdued',
    },
    {
      id: 'a(a(A)-b(D)rel(Owns))-b(D)',
      source: 'a(A)-b(D)rel(Owns)',
      sourceShape: 'relationship',
      target: 'D',
      targetShape: 'rectangle',
      color: 'subdued',
    },
    {
      id: 'a(A)-b(a(A)-b(E)rel(Communicates_with))',
      source: 'A',
      sourceShape: 'hexagon',
      target: 'a(A)-b(E)rel(Communicates_with)',
      targetShape: 'relationship',
      color: 'subdued',
    },
    {
      id: 'a(a(A)-b(E)rel(Communicates_with))-b(E)',
      source: 'a(A)-b(E)rel(Communicates_with)',
      sourceShape: 'relationship',
      target: 'E',
      targetShape: 'rectangle',
      color: 'subdued',
    },
  ] as EdgeViewModel[],
};
