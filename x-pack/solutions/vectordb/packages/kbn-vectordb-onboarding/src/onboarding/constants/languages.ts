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
import rubyIcon from '../../assets/ruby.svg';
import type { Language, LanguageDescriptor } from '../types';

export const LANGUAGES: readonly LanguageDescriptor[] = [
  { id: 'python', label: 'Python', syntax: 'python', icon: pythonIcon },
  { id: 'javascript', label: 'JavaScript', syntax: 'javascript', icon: javascriptIcon },
  { id: 'java', label: 'Java', syntax: 'java', icon: javaIcon },
  { id: 'go', label: 'Go', syntax: 'go', icon: goIcon },
  { id: 'rust', label: 'Rust', syntax: 'rust', icon: rustIcon },
  { id: 'csharp', label: 'C#', syntax: 'csharp', icon: csharpIcon },
  { id: 'ruby', label: 'Ruby', syntax: 'ruby', icon: rubyIcon },
];

export const DEFAULT_LANGUAGE: Language = 'python';
