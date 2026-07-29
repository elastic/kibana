/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export interface AgentDefinitionSnapshot {
  type?: string;
  configuration: {
    skill_ids?: readonly string[];
  };
}

export interface AgentTypeSnapshot {
  baseConfiguration: {
    skill_ids?: readonly string[];
  };
}

export interface SkillSnapshot {
  name: string;
  description: string;
}

export interface AgentLookup {
  getAgent: (id: string) => AgentDefinitionSnapshot | null | undefined;
  getAgentType: (typeId: string) => AgentTypeSnapshot | null | undefined;
  getSkill: (id: string) => SkillSnapshot | null | undefined;
}
