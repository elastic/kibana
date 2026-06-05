/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import pythonIcon from '../../assets/python.svg';
import javascriptIcon from '../../assets/javascript.svg';
import javaIcon from '../../assets/java.svg';
import goIcon from '../../assets/go.svg';
import rustIcon from '../../assets/rust.svg';
import csharpIcon from '../../assets/csharp.svg';

export type Language = 'python' | 'javascript' | 'java' | 'go' | 'rust' | 'csharp';

export interface LanguageDescriptor {
  id: Language;
  label: string;
  syntax: string;
  icon: string;
}

export const LANGUAGES: readonly LanguageDescriptor[] = [
  { id: 'python', label: 'Python', syntax: 'python', icon: pythonIcon },
  { id: 'javascript', label: 'JavaScript', syntax: 'javascript', icon: javascriptIcon },
  { id: 'java', label: 'Java', syntax: 'java', icon: javaIcon },
  { id: 'go', label: 'Go', syntax: 'go', icon: goIcon },
  { id: 'rust', label: 'Rust', syntax: 'rust', icon: rustIcon },
  { id: 'csharp', label: 'C#', syntax: 'csharp', icon: csharpIcon },
];

export const DEFAULT_LANGUAGE: Language = 'python';

export type SnippetSet = Record<Language, string>;
