/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { DeepPartial } from 'utility-types';
import { merge } from 'lodash';
import { BaseDataGenerator } from './base_data_generator';
import type { EndpointScript } from '../types';
import { SUPPORTED_HOST_OS_TYPE } from '../constants';
import type { SCRIPT_TAGS } from '../service/scripts_library/constants';
import { SORTED_SCRIPT_TAGS_KEYS } from '../service/scripts_library/constants';

export class EndpointScriptsGenerator extends BaseDataGenerator {
  generate(overrides: DeepPartial<EndpointScript> = {}): EndpointScript {
    const createdBy = this.randomUser();

    const createdAt = overrides.createdAt ? new Date(overrides.createdAt) : new Date();
    const updatedAt = overrides.updatedAt
      ? new Date(overrides.updatedAt)
      : new Date(createdAt.getTime() + 13 * 60 * 1000); // default updatedAt 13 minutes later

    const platform = overrides.platform?.length
      ? (overrides.platform as Array<EndpointScript['platform'][number]>)
      : this.randomPlatform();

    const tags = overrides.tags?.length
      ? (overrides.tags as Array<keyof typeof SCRIPT_TAGS>)
      : this.randomTags();

    const name = overrides.name ?? this.randomScriptName();

    const id = overrides.id ?? this.seededUUIDv4();
    const randomScript = {
      id,
      name,
      platform,
      fileName: this.randomFileName(platform),
      fileSize: this.randomFileSizeInBytes(),
      fileHash: this.randomSHA256(),
      fileId: this.randomUUID(),
      requiresInput: this.randomBoolean(),
      downloadUri: `/api/endpoint/scripts_library/${id}/download`,
      tags,
      description: `${this.randomString(240)}\n ${this.randomString(240)} \n ${this.randomString(
        240
      )}`,
      instructions: `${this.randomString(60)}\n ${this.randomString(60)} \n ${this.randomString(
        60
      )}`,
      example: `${this.randomString(30)}\n ${this.randomString(30)} \n ${this.randomString(30)}`,
      pathToExecutable: `/usr/local/bin/${name}`,
      createdBy,
      createdAt,
      updatedAt,
      updatedBy: createdBy,
      version: this.randomDocVersion(),
    };

    return merge(randomScript, overrides);
  }

  generateListOfScripts(overrides: DeepPartial<EndpointScript>[] = [{}]): EndpointScript[] {
    return overrides.map((o) => this.generate(o));
  }

  protected randomFileSizeInBytes(): number {
    // random file size between 1KB and 25MB
    return this.randomN(25 * 1024 * 1024 - 1024) + 1024;
  }

  randomScriptName(): string {
    return `${this.randomString(5)}-script`;
  }

  protected randomFileName(platform: Array<EndpointScript['platform'][number]>): string {
    const linuxExtensions = ['sh', 'py'];
    const windowsExtensions = ['ps1', 'bat', 'cmd', 'py'];
    if (platform.includes('macos') || platform.includes('linux')) {
      return `${this.randomString(5)}-script.${this.randomChoice(linuxExtensions)}`;
    }
    if (platform.includes('windows')) {
      return `${this.randomString(5)}-script.${this.randomChoice(windowsExtensions)}`;
    }
    return `${this.randomString(5)}-script.${this.randomChoice([
      ...linuxExtensions,
      ...windowsExtensions,
    ])}`;
  }

  protected randomPlatform(): Array<EndpointScript['platform'][number]> {
    const selectedPlatforms: Array<EndpointScript['platform'][number]> = [];
    const numberOfPlatforms = this.randomN(SUPPORTED_HOST_OS_TYPE.length) + 1;
    while (selectedPlatforms.length < numberOfPlatforms) {
      const platform = this.randomChoice(SUPPORTED_HOST_OS_TYPE);
      if (!selectedPlatforms.includes(platform)) {
        selectedPlatforms.push(platform);
      }
    }
    return selectedPlatforms;
  }

  protected randomSHA256(): string {
    return this.randomArray(64, () => Math.floor(Math.random() * 36).toString(36)).join('');
  }

  protected randomTags(): Array<keyof typeof SCRIPT_TAGS> {
    const tags: Array<keyof typeof SCRIPT_TAGS> = [];
    const numberOfTags = this.randomN(SORTED_SCRIPT_TAGS_KEYS.length);
    // Ensure unique tags and no duplicates, but random number of items
    while (tags.length < numberOfTags) {
      const tag = this.randomChoice(SORTED_SCRIPT_TAGS_KEYS);
      if (!tags.includes(tag)) {
        tags.push(tag);
      }
    }
    return tags;
  }

  protected randomDocVersion(): string {
    return this.randomString(12);
  }
}
