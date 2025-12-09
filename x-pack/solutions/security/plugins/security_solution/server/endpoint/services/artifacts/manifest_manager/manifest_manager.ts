/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import semver from 'semver';
import { chunk, isEmpty, isEqual, keyBy } from 'lodash';
import { set } from '@kbn/safer-lodash-set';
import {
  type Logger,
  type SavedObjectsClientContract,
  type ElasticsearchClient,
  SavedObjectsErrorHelpers,
} from '@kbn/core/server';
import { ENDPOINT_ARTIFACT_LISTS } from '@kbn/securitysolution-list-constants';
import type { PackagePolicy } from '@kbn/fleet-plugin/common';
import type { Artifact, PackagePolicyClient } from '@kbn/fleet-plugin/server';
import type { ExceptionListClient } from '@kbn/lists-plugin/server';
import type { ExceptionListItemSchema } from '@kbn/securitysolution-io-ts-list-types';
import { ProductFeatureKey } from '@kbn/security-solution-features/keys';
import { asyncForEach } from '@kbn/std';
import { DEFAULT_SPACE_ID } from '@kbn/spaces-plugin/common';
import type { PolicyData, PromiseResolvedValue } from '../../../../../common/endpoint/types';
import { UnifiedManifestClient } from '../unified_manifest_client';
import { stringify } from '../../../utils/stringify';
import { QueueProcessor } from '../../../utils/queue_processor';
import type { ProductFeaturesService } from '../../../../lib/product_features_service/product_features_service';
import type { ExperimentalFeatures } from '../../../../../common';
import type { LicenseService } from '../../../../../common/license';
import type { ManifestSchemaVersion } from '../../../../../common/endpoint/schema/common';
import {
  manifestDispatchSchema,
  type ManifestSchema,
} from '../../../../../common/endpoint/schema/manifest';

import {
  ArtifactConstants,
  type ArtifactListId,
  buildArtifact,
  convertExceptionsToEndpointFormat,
  getAllItemsFromEndpointExceptionList,
  getArtifactId,
  Manifest,
} from '../../../lib/artifacts';

import {
  type InternalUnifiedManifestBaseSchema,
  type InternalUnifiedManifestSchema,
  type InternalUnifiedManifestUpdateSchema,
  internalArtifactCompleteSchema,
  type InternalArtifactCompleteSchema,
  type InternalManifestSchema,
  type WrappedTranslatedExceptionList,
} from '../../../schemas/artifacts';
import type { EndpointArtifactClientInterface } from '../artifact_client';
import { ManifestClient } from '../manifest_client';
import { InvalidInternalManifestError } from '../errors';
import { wrapErrorIfNeeded } from '../../../utils';
import { EndpointError } from '../../../../../common/endpoint/errors';
import type { SavedObjectsClientFactory } from '../../saved_objects';

interface ArtifactsBuildResult {
  defaultArtifacts: InternalArtifactCompleteSchema[];
  policySpecificArtifacts: Record<string, InternalArtifactCompleteSchema[]>;
}

interface BuildArtifactsForOsOptions {
  listId: ArtifactListId;
  name: string;
  exceptionItemDecorator?: (item: ExceptionListItemSchema) => ExceptionListItemSchema;
}

const iterateArtifactsBuildResult = (
  result: ArtifactsBuildResult,
  callback: (artifact: InternalArtifactCompleteSchema, policyId?: string) => void
) => {
  for (const artifact of result.defaultArtifacts) {
    callback(artifact);
  }

  for (const policyId of Object.keys(result.policySpecificArtifacts)) {
    for (const artifact of result.policySpecificArtifacts[policyId]) {
      callback(artifact, policyId);
    }
  }
};

export interface ManifestManagerContext {
  savedObjectsClientFactory: SavedObjectsClientFactory;
  savedObjectsClient: SavedObjectsClientContract;
  artifactClient: EndpointArtifactClientInterface;
  exceptionListClient: ExceptionListClient;
  packagePolicyService: PackagePolicyClient;
  logger: Logger;
  experimentalFeatures: ExperimentalFeatures;
  packagerTaskPackagePolicyUpdateBatchSize: number;
  esClient: ElasticsearchClient;
  productFeaturesService: ProductFeaturesService;
  licenseService: LicenseService;
}

const getArtifactIds = (manifest: ManifestSchema) =>
  [...Object.keys(manifest.artifacts)].map(
    (key) => `${key}-${manifest.artifacts[key].decoded_sha256}`
  );

const manifestsEqual = (manifest1: ManifestSchema, manifest2: ManifestSchema) =>
  isEqual(new Set(getArtifactIds(manifest1)), new Set(getArtifactIds(manifest2)));

export class ManifestManager {
  protected artifactClient: EndpointArtifactClientInterface;
  protected exceptionListClient: ExceptionListClient;
  protected packagePolicyService: PackagePolicyClient;
  protected savedObjectsClient: SavedObjectsClientContract;
  protected logger: Logger;
  protected schemaVersion: ManifestSchemaVersion;
  protected experimentalFeatures: ExperimentalFeatures;
  protected cachedExceptionsListsByOs: Map<string, ExceptionListItemSchema[]>;
  protected packagerTaskPackagePolicyUpdateBatchSize: number;
  protected esClient: ElasticsearchClient;
  protected productFeaturesService: ProductFeaturesService;
  protected licenseService: LicenseService;
  protected savedObjectsClientFactory: SavedObjectsClientFactory;

  constructor(context: ManifestManagerContext) {
    this.savedObjectsClientFactory = context.savedObjectsClientFactory;

    this.artifactClient = context.artifactClient;
    this.exceptionListClient = context.exceptionListClient;
    this.packagePolicyService = context.packagePolicyService;
    this.savedObjectsClient = context.savedObjectsClient;
    this.logger = context.logger;
    this.schemaVersion = 'v1';
    this.experimentalFeatures = context.experimentalFeatures;
    this.cachedExceptionsListsByOs = new Map();
    this.packagerTaskPackagePolicyUpdateBatchSize =
      context.packagerTaskPackagePolicyUpdateBatchSize;
    this.esClient = context.esClient;
    this.productFeaturesService = context.productFeaturesService;
    this.licenseService = context.licenseService;
  }

  /**
   * Gets a ManifestClient for this manager's schemaVersion.
   *
   * @returns {ManifestClient} A ManifestClient scoped to the appropriate schemaVersion.
   */
  protected getManifestClient(): ManifestClient {
    return new ManifestClient(this.savedObjectsClient, this.schemaVersion);
  }

  /**
   * Determines if exceptions should be retrieved based on licensing conditions
   * @private
   */
  private shouldRetrieveExceptions(listId: ArtifactListId): boolean {
    // endpointHostIsolationExceptions includes full CRUD support for Host Isolation Exceptions
    // Host Isolation Exceptions require feature enablement (serverless).
    const isHostIsolationWithFeatureEnabled =
      listId === ENDPOINT_ARTIFACT_LISTS.hostIsolationExceptions.id &&
      this.productFeaturesService.isEnabled(ProductFeatureKey.endpointHostIsolationExceptions);

    // Trusted Devices requires enterprise license (ess) or feature enablement (serverless).
    // In serverless .isEnterprise() will always yield true, in ESS feature check .isEnabled() will also always yield true.
    // Therefore both conditions must be met in both environments.
    const isTrustedDevicesWithFeatureAndEnterpriseLicense =
      listId === ENDPOINT_ARTIFACT_LISTS.trustedDevices.id &&
      this.experimentalFeatures.trustedDevices &&
      this.productFeaturesService.isEnabled(ProductFeatureKey.endpointTrustedDevices) &&
      this.licenseService.isEnterprise();

    // endpointArtifactManagement includes full CRUD support for all other exception lists + RD support for Host Isolation Exceptions
    const isOtherArtifactWithFeatureEnabled =
      listId !== ENDPOINT_ARTIFACT_LISTS.hostIsolationExceptions.id &&
      listId !== ENDPOINT_ARTIFACT_LISTS.trustedDevices.id &&
      this.productFeaturesService.isEnabled(ProductFeatureKey.endpointArtifactManagement);

    return (
      isHostIsolationWithFeatureEnabled ||
      isTrustedDevicesWithFeatureAndEnterpriseLicense ||
      isOtherArtifactWithFeatureEnabled
    );
  }

  /**
   * Search or get exceptions from the cached map by listId and OS and filter those by policyId/global
   */
  protected async getCachedExceptions({
    elClient,
    listId,
    os,
    policyId,
    schemaVersion,
    exceptionItemDecorator,
  }: {
    elClient: ExceptionListClient;
    listId: ArtifactListId;
    os: string;
    policyId?: string;
    schemaVersion: string;
    exceptionItemDecorator?: (item: ExceptionListItemSchema) => ExceptionListItemSchema;
  }): Promise<WrappedTranslatedExceptionList> {
    if (!this.cachedExceptionsListsByOs.has(`${listId}-${os}`)) {
      let itemsByListId: ExceptionListItemSchema[] = [];
      // If there are host isolation exceptions in place but there is a downgrade scenario (serverless), those shouldn't be taken into account when generating artifacts.
      // If there are trusted devices in place but there is a downgrade scenario (ess/serverless), those shouldn't be taken into account when generating artifacts.
      if (this.shouldRetrieveExceptions(listId)) {
        itemsByListId = await getAllItemsFromEndpointExceptionList({
          elClient,
          os,
          listId,
        });

        if (exceptionItemDecorator) {
          itemsByListId = itemsByListId.map(exceptionItemDecorator);
        }
      }
      this.cachedExceptionsListsByOs.set(`${listId}-${os}`, itemsByListId);
    }

    const allExceptionsByListId = this.cachedExceptionsListsByOs.get(`${listId}-${os}`);
    if (!allExceptionsByListId) {
      throw new InvalidInternalManifestError(`Error getting exceptions for ${listId}-${os}`);
    }

    const filter = (exception: ExceptionListItemSchema) =>
      policyId
        ? exception.tags.includes('policy:all') || exception.tags.includes(`policy:${policyId}`)
        : exception.tags.includes('policy:all');

    let exceptions: ExceptionListItemSchema[];

    if (this.experimentalFeatures.endpointExceptionsMovedUnderManagement) {
      // with the feature enabled, we do not make an 'exception' with endpoint exceptions - it's filtered per-policy
      exceptions = allExceptionsByListId.filter(filter);
    } else {
      exceptions =
        listId === ENDPOINT_ARTIFACT_LISTS.endpointExceptions.id
          ? allExceptionsByListId
          : allExceptionsByListId.filter(filter);
    }

    return convertExceptionsToEndpointFormat(exceptions, schemaVersion, this.experimentalFeatures);
  }

  /**
   * Builds an artifact (one per supported OS) based on the current state of the
   * artifacts list (Trusted Apps, Host Iso. Exceptions, Event Filters, Blocklists)
   * (which uses the `exception-list-agnostic` SO type)
   */
  protected async buildArtifactsForOs({
    listId,
    name,
    os,
    policyId,
    exceptionItemDecorator,
  }: {
    os: string;
    policyId?: string;
  } & BuildArtifactsForOsOptions): Promise<InternalArtifactCompleteSchema> {
    return buildArtifact(
      await this.getCachedExceptions({
        elClient: this.exceptionListClient,
        schemaVersion: this.schemaVersion,
        os,
        policyId,
        listId,
        exceptionItemDecorator,
      }),
      this.schemaVersion,
      os,
      name
    );
  }

  /**
   * Builds an artifact (by policy) based on the current state of the
   * artifacts list (Trusted Apps, Host Iso. Exceptions, Event Filters, Blocklists)
   * (which uses the `exception-list-agnostic` SO type)
   */
  protected async buildArtifactsByPolicy(
    allPolicyIds: string[],
    supportedOSs: string[],
    osOptions: BuildArtifactsForOsOptions
  ): Promise<Record<string, InternalArtifactCompleteSchema[]>> {
    const policySpecificArtifacts: Record<string, InternalArtifactCompleteSchema[]> = {};
    for (const policyId of allPolicyIds)
      for (const os of supportedOSs) {
        policySpecificArtifacts[policyId] = policySpecificArtifacts[policyId] || [];
        policySpecificArtifacts[policyId].push(
          await this.buildArtifactsForOs({ os, policyId, ...osOptions })
        );
      }

    return policySpecificArtifacts;
  }

  /**
   * Builds an array of artifacts (one per supported OS) based on the current
   * state of exception-list-agnostic SOs.
   *
   * @returns {Promise<InternalArtifactCompleteSchema[]>} An array of uncompressed artifacts built from exception-list-agnostic SOs.
   * @throws Throws/rejects if there are errors building the list.
   */
  protected async buildExceptionListArtifacts(
    allPolicyIds: string[]
  ): Promise<ArtifactsBuildResult> {
    const defaultArtifacts: InternalArtifactCompleteSchema[] = [];

    const decorateWildcardOnlyExceptionItem = (item: ExceptionListItemSchema) => {
      const isWildcardOnly = item.entries.every(({ type }) => type === 'wildcard');

      // add `event.module=endpoint` to make endpoints older than 8.2 work when only `wildcard` is used
      if (isWildcardOnly) {
        item.entries.push({
          type: 'match',
          operator: 'included',
          field: 'event.module',
          value: 'endpoint',
        });
      }

      return item;
    };

    const buildArtifactsForOsOptions: BuildArtifactsForOsOptions = {
      listId: ENDPOINT_ARTIFACT_LISTS.endpointExceptions.id,
      name: ArtifactConstants.GLOBAL_ENDPOINT_EXCEPTIONS_NAME,
      exceptionItemDecorator: decorateWildcardOnlyExceptionItem,
    };

    for (const os of ArtifactConstants.SUPPORTED_ENDPOINT_EXCEPTIONS_OPERATING_SYSTEMS) {
      defaultArtifacts.push(await this.buildArtifactsForOs({ os, ...buildArtifactsForOsOptions }));
    }

    let policySpecificArtifacts: Record<string, InternalArtifactCompleteSchema[]> = {};

    if (this.experimentalFeatures.endpointExceptionsMovedUnderManagement) {
      policySpecificArtifacts = await this.buildArtifactsByPolicy(
        allPolicyIds,
        ArtifactConstants.SUPPORTED_ENDPOINT_EXCEPTIONS_OPERATING_SYSTEMS,
        buildArtifactsForOsOptions
      );
    } else {
      allPolicyIds.forEach((policyId) => {
        policySpecificArtifacts[policyId] = defaultArtifacts;
      });
    }

    return { defaultArtifacts, policySpecificArtifacts };
  }

  /**
   * Builds an array of artifacts (one per supported OS) based on the current state of the
   * Trusted Apps list (which uses the `exception-list-agnostic` SO type)
   */
  protected async buildTrustedAppsArtifacts(allPolicyIds: string[]): Promise<ArtifactsBuildResult> {
    const defaultArtifacts: InternalArtifactCompleteSchema[] = [];
    const buildArtifactsForOsOptions: BuildArtifactsForOsOptions = {
      listId: ENDPOINT_ARTIFACT_LISTS.trustedApps.id,
      name: ArtifactConstants.GLOBAL_TRUSTED_APPS_NAME,
    };

    for (const os of ArtifactConstants.SUPPORTED_TRUSTED_APPS_OPERATING_SYSTEMS) {
      defaultArtifacts.push(await this.buildArtifactsForOs({ os, ...buildArtifactsForOsOptions }));
    }

    const policySpecificArtifacts: Record<string, InternalArtifactCompleteSchema[]> =
      await this.buildArtifactsByPolicy(
        allPolicyIds,
        ArtifactConstants.SUPPORTED_TRUSTED_APPS_OPERATING_SYSTEMS,
        buildArtifactsForOsOptions
      );

    return { defaultArtifacts, policySpecificArtifacts };
  }

  /**
   * Builds an array of artifacts (one per supported OS) based on the current state of the
   * Trusted Devices list
   * @protected
   */
  protected async buildTrustedDevicesArtifacts(
    allPolicyIds: string[]
  ): Promise<ArtifactsBuildResult> {
    const defaultArtifacts: InternalArtifactCompleteSchema[] = [];
    const buildArtifactsForOsOptions: BuildArtifactsForOsOptions = {
      listId: ENDPOINT_ARTIFACT_LISTS.trustedDevices.id,
      name: ArtifactConstants.GLOBAL_TRUSTED_DEVICES_NAME,
    };

    for (const os of ArtifactConstants.SUPPORTED_TRUSTED_DEVICES_OPERATING_SYSTEMS) {
      defaultArtifacts.push(await this.buildArtifactsForOs({ os, ...buildArtifactsForOsOptions }));
    }

    const policySpecificArtifacts: Record<string, InternalArtifactCompleteSchema[]> =
      await this.buildArtifactsByPolicy(
        allPolicyIds,
        ArtifactConstants.SUPPORTED_TRUSTED_DEVICES_OPERATING_SYSTEMS,
        buildArtifactsForOsOptions
      );

    return { defaultArtifacts, policySpecificArtifacts };
  }

  /**
   * Builds an array of endpoint event filters (one per supported OS) based on the current state of the
   * Event Filters list
   * @protected
   */
  protected async buildEventFiltersArtifacts(
    allPolicyIds: string[]
  ): Promise<ArtifactsBuildResult> {
    const defaultArtifacts: InternalArtifactCompleteSchema[] = [];
    const buildArtifactsForOsOptions: BuildArtifactsForOsOptions = {
      listId: ENDPOINT_ARTIFACT_LISTS.eventFilters.id,
      name: ArtifactConstants.GLOBAL_EVENT_FILTERS_NAME,
    };

    for (const os of ArtifactConstants.SUPPORTED_EVENT_FILTERS_OPERATING_SYSTEMS) {
      defaultArtifacts.push(await this.buildArtifactsForOs({ os, ...buildArtifactsForOsOptions }));
    }

    const policySpecificArtifacts: Record<string, InternalArtifactCompleteSchema[]> =
      await this.buildArtifactsByPolicy(
        allPolicyIds,
        ArtifactConstants.SUPPORTED_EVENT_FILTERS_OPERATING_SYSTEMS,
        buildArtifactsForOsOptions
      );

    return { defaultArtifacts, policySpecificArtifacts };
  }

  /**
   * Builds an array of Blocklist entries (one per supported OS) based on the current state of the
   * Blocklist list
   * @protected
   */
  protected async buildBlocklistArtifacts(allPolicyIds: string[]): Promise<ArtifactsBuildResult> {
    const defaultArtifacts: InternalArtifactCompleteSchema[] = [];
    const buildArtifactsForOsOptions: BuildArtifactsForOsOptions = {
      listId: ENDPOINT_ARTIFACT_LISTS.blocklists.id,
      name: ArtifactConstants.GLOBAL_BLOCKLISTS_NAME,
    };

    for (const os of ArtifactConstants.SUPPORTED_BLOCKLISTS_OPERATING_SYSTEMS) {
      defaultArtifacts.push(await this.buildArtifactsForOs({ os, ...buildArtifactsForOsOptions }));
    }

    const policySpecificArtifacts: Record<string, InternalArtifactCompleteSchema[]> =
      await this.buildArtifactsByPolicy(
        allPolicyIds,
        ArtifactConstants.SUPPORTED_BLOCKLISTS_OPERATING_SYSTEMS,
        buildArtifactsForOsOptions
      );

    return { defaultArtifacts, policySpecificArtifacts };
  }

  /**
   * Builds an array of endpoint host isolation exception (one per supported OS) based on the current state of the
   * Host Isolation Exception List
   * @returns
   */

  protected async buildHostIsolationExceptionsArtifacts(
    allPolicyIds: string[]
  ): Promise<ArtifactsBuildResult> {
    const defaultArtifacts: InternalArtifactCompleteSchema[] = [];
    const buildArtifactsForOsOptions: BuildArtifactsForOsOptions = {
      listId: ENDPOINT_ARTIFACT_LISTS.hostIsolationExceptions.id,
      name: ArtifactConstants.GLOBAL_HOST_ISOLATION_EXCEPTIONS_NAME,
    };

    for (const os of ArtifactConstants.SUPPORTED_HOST_ISOLATION_EXCEPTIONS_OPERATING_SYSTEMS) {
      defaultArtifacts.push(await this.buildArtifactsForOs({ os, ...buildArtifactsForOsOptions }));
    }

    const policySpecificArtifacts: Record<string, InternalArtifactCompleteSchema[]> =
      await this.buildArtifactsByPolicy(
        allPolicyIds,
        ArtifactConstants.SUPPORTED_HOST_ISOLATION_EXCEPTIONS_OPERATING_SYSTEMS,
        buildArtifactsForOsOptions
      );

    return { defaultArtifacts, policySpecificArtifacts };
  }

  /**
   * Writes new artifact to Fleet
   *
   * @param artifacts An InternalArtifactCompleteSchema array representing the artifacts.
   * @param newManifest A Manifest representing the new manifest
   * @returns {Promise<Error[]>} Any errors encountered.
   */
  public async pushArtifacts(
    artifacts: InternalArtifactCompleteSchema[],
    newManifest: Manifest
  ): Promise<Error[]> {
    const errors: Error[] = [];
    const artifactsToCreate: InternalArtifactCompleteSchema[] = [];

    for (const artifact of artifacts) {
      if (internalArtifactCompleteSchema.is(artifact)) {
        artifactsToCreate.push(artifact);
      } else {
        errors.push(new EndpointError(`Incomplete artifact: ${getArtifactId(artifact)}`, artifact));
      }
    }

    if (artifactsToCreate.length === 0) {
      return errors;
    }

    this.logger.debug(`Creating [${artifactsToCreate.length}] artifacts`);

    const { artifacts: fleetArtifacts, errors: createErrors } =
      await this.artifactClient.bulkCreateArtifacts(artifactsToCreate);

    this.logger.info(`Count of artifacts created: ${fleetArtifacts?.length ?? 0}`);

    if (createErrors) {
      errors.push(...createErrors);
    }

    const newArtifactsAddedToManifest: string[] = [];
    const artifactsNotCreated: string[] = [];

    if (fleetArtifacts) {
      const fleetArtifactsByIdentifier: { [key: string]: InternalArtifactCompleteSchema } = {};

      fleetArtifacts.forEach((fleetArtifact) => {
        fleetArtifactsByIdentifier[getArtifactId(fleetArtifact)] = fleetArtifact;
      });

      artifactsToCreate.forEach((artifact) => {
        const artifactId = getArtifactId(artifact);
        const fleetArtifact = fleetArtifactsByIdentifier[artifactId];

        if (!fleetArtifact) {
          artifactsNotCreated.push(artifactId);

          return;
        }

        newManifest.replaceArtifact(fleetArtifact);
        newArtifactsAddedToManifest.push(artifactId);
      });
    }

    if (artifactsNotCreated.length) {
      this.logger.debug(
        `A total of [${
          artifactsNotCreated.length
        }] artifacts were not created. Prior version of the artifact will remain in manifest.\n${artifactsNotCreated.join(
          '\n'
        )}`
      );
    }

    if (newArtifactsAddedToManifest.length !== 0) {
      this.logger.debug(
        `Newly created artifacts added to the manifest:\n${newArtifactsAddedToManifest.join('\n')}`
      );
    }

    return errors;
  }

  /**
   * Deletes outdated artifact SOs.
   *
   * @param artifactIds The IDs of the artifact to delete..
   * @returns {Promise<Error[]>} Any errors encountered.
   */
  public async deleteArtifacts(artifactIds: string[]): Promise<Error[]> {
    try {
      if (isEmpty(artifactIds)) {
        return [];
      }

      const errors = await this.artifactClient.bulkDeleteArtifacts(artifactIds);

      if (!isEmpty(errors)) {
        return errors;
      }

      this.logger.info(`Count of cleaned up artifacts: ${artifactIds.length}`);

      if (artifactIds.length !== 0) {
        this.logger.debug(`Deleted artifacts from cleanup:\n${artifactIds.join('\n  ')}`);
      }

      return [];
    } catch (err) {
      this.logger.error(
        `Attempted to delete [${artifactIds.length}] outdated artifacts failed with: ${err.message}\n${err.stack}`
      );
      return [err];
    }
  }

  /**
   * Returns the last computed manifest based on the state of the user-artifact-manifest SO. If no
   * artifacts have been created yet (ex. no Endpoint policies are in use), then method return `null`
   *
   * @returns {Promise<Manifest | null>} The last computed manifest, or null if does not exist.
   * @throws Throws/rejects if there is an unexpected error retrieving the manifest.
   */
  public async getLastComputedManifest(): Promise<Manifest | null> {
    try {
      let manifestSo;
      const unifiedManifestsSo = await this.getAllUnifiedManifestsSO();
      // On first run, there will be no existing Unified Manifests SO, so we need to copy the semanticVersion from the legacy manifest
      // This is to ensure that the first Unified Manifest created has the same semanticVersion as the legacy manifest and is not too far
      // behind for package policy to pick it up.
      if (unifiedManifestsSo.length === 0) {
        const legacyManifestSo = await this.getManifestClient().getManifest();
        const legacySemanticVersion = legacyManifestSo?.attributes?.semanticVersion;
        manifestSo = this.transformUnifiedManifestSOtoLegacyManifestSO(
          unifiedManifestsSo,
          legacySemanticVersion
        );
      } else {
        manifestSo = this.transformUnifiedManifestSOtoLegacyManifestSO(unifiedManifestsSo);
      }

      if (manifestSo.version === undefined) {
        throw new InvalidInternalManifestError(
          'Internal Manifest map SavedObject is missing version',
          manifestSo
        );
      }

      const manifest = new Manifest({
        schemaVersion: this.schemaVersion,
        semanticVersion: manifestSo.attributes.semanticVersion,
        soVersion: manifestSo.version,
      });

      const fleetArtifacts = await this.listAllArtifacts();
      const fleetArtifactsById = keyBy(fleetArtifacts, (artifact) => getArtifactId(artifact));
      const invalidArtifactIds: string[] = [];

      // Ensure that all artifacts currently defined in the Manifest have a valid artifact in fleet,
      // and remove any that does not have an actual artifact from the manifest
      for (const entry of manifestSo.attributes.artifacts) {
        const artifact = fleetArtifactsById[entry.artifactId];

        if (!artifact) {
          invalidArtifactIds.push(entry.artifactId);
        } else {
          manifest.addEntry(artifact, entry.policyId);
        }
      }

      if (invalidArtifactIds.length) {
        this.logger.warn(
          `Missing artifacts detected! Internal artifact manifest (SavedObject version [${
            manifestSo.version
          }]) references [${
            invalidArtifactIds.length
          }] artifact IDs that don't exist.\nFirst 10 below (run with logging set to 'debug' to see all):\n${invalidArtifactIds
            .slice(0, 10)
            .join('\n')}`
        );
        this.logger.debug(
          `Artifact ID references that are missing:\n${stringify(invalidArtifactIds)}`
        );
      }

      return manifest;
    } catch (error) {
      if (!error.output || error.output.statusCode !== 404) {
        throw wrapErrorIfNeeded(error);
      }
      return null;
    }
  }

  /**
   * creates a new default Manifest
   */
  public static createDefaultManifest(schemaVersion?: ManifestSchemaVersion): Manifest {
    return Manifest.getDefault(schemaVersion);
  }

  /**
   * Builds a new manifest based on the current user exception list.
   *
   * @param baselineManifest A baseline manifest to use for initializing pre-existing artifacts.
   * @returns {Promise<Manifest>} A new Manifest object representing the current exception list.
   */
  public async buildNewManifest(
    baselineManifest: Manifest = ManifestManager.createDefaultManifest(this.schemaVersion)
  ): Promise<Manifest> {
    const allPolicyIds = await this.listEndpointPolicyIds();
    const results = await Promise.all([
      this.buildExceptionListArtifacts(allPolicyIds),
      this.buildTrustedAppsArtifacts(allPolicyIds),
      this.buildEventFiltersArtifacts(allPolicyIds),
      this.buildHostIsolationExceptionsArtifacts(allPolicyIds),
      this.buildBlocklistArtifacts(allPolicyIds),
      ...(this.experimentalFeatures.trustedDevices
        ? [this.buildTrustedDevicesArtifacts(allPolicyIds)]
        : []),
    ]);

    // Clear cache as the ManifestManager instance is reused on every run.
    this.cachedExceptionsListsByOs.clear();

    const manifest = new Manifest({
      schemaVersion: this.schemaVersion,
      semanticVersion: baselineManifest.getSemanticVersion(),
      soVersion: baselineManifest.getSavedObjectVersion(),
    });

    for (const result of results) {
      iterateArtifactsBuildResult(result, (artifact, policyId) => {
        manifest.addEntry(
          baselineManifest.getArtifact(getArtifactId(artifact)) || artifact,
          policyId
        );
      });
    }

    return manifest;
  }

  /**
   * Dispatches the manifest by writing it to the endpoint package policy, if different
   * from the manifest already in the config.
   *
   * @param manifest The Manifest to dispatch.
   * @returns {Promise<Error[]>} Any errors encountered.
   */
  public async tryDispatch(manifest: Manifest): Promise<Error[]> {
    const errors: Error[] = [];
    const updatedPolicies: string[] = [];
    const unChangedPolicies: string[] = [];
    const manifestVersion = manifest.getSemanticVersion();
    const execId = Math.random().toString(32).substring(3, 8);
    const savedObjects = this.savedObjectsClientFactory;
    const wasPolicyUpdateRetried = new Set<string>();
    // inflightRequests: stores promises that may be curently processing that are outside of the batch processor (ex. retries)
    const inflightRequests = new Set<Promise<unknown>>();
    const policyUpdateBatchProcessor = new QueueProcessor<PackagePolicy>({
      batchSize: this.packagerTaskPackagePolicyUpdateBatchSize,
      logger: this.logger,
      key: `tryDispatch.${execId}`,
      batchHandler: async ({ data: currentBatch }) => {
        try {
          // With spaces, we need to group the updates by Space ID so that a properly scoped
          // SO client is used for the update.
          const updatesBySpace: Record<string, PackagePolicy[]> = {};

          for (const packagePolicy of currentBatch) {
            const packagePolicySpace = packagePolicy.spaceIds?.at(0) ?? DEFAULT_SPACE_ID;

            if (!updatesBySpace[packagePolicySpace]) {
              updatesBySpace[packagePolicySpace] = [];
            }

            updatesBySpace[packagePolicySpace].push(packagePolicy);
          }

          const response: Required<
            PromiseResolvedValue<ReturnType<typeof this.packagePolicyService.bulkUpdate>>
          > = {
            updatedPolicies: [],
            failedPolicies: [],
          };

          for (const [spaceId, spaceUpdates] of Object.entries(updatesBySpace)) {
            this.logger.debug(
              `updating [${spaceUpdates.length}] package policies for space id [${spaceId}]`
            );

            const bulkUpdateResponse = await this.packagePolicyService.bulkUpdate(
              savedObjects.createInternalScopedSoClient({ spaceId, readonly: false }),
              this.esClient,
              spaceUpdates
            );

            // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
            response.updatedPolicies!.push(...(bulkUpdateResponse.updatedPolicies ?? []));

            const updateErrors: (typeof bulkUpdateResponse)['failedPolicies'] = [];

            for (const failedPolicy of bulkUpdateResponse.failedPolicies) {
              // We retry the update 1 more time for SO conflict. It's possible that a policy could have
              // been updated while manifest manager was in progress. In these cases, we try the update
              // again to ensure that the policy receives the updated manifest.
              if (
                SavedObjectsErrorHelpers.isConflictError(failedPolicy.error as Error) &&
                !wasPolicyUpdateRetried.has(failedPolicy.packagePolicy.id ?? '') &&
                failedPolicy.packagePolicy.id
              ) {
                wasPolicyUpdateRetried.add(failedPolicy.packagePolicy.id);

                this.logger.debug(
                  () =>
                    `Conflict error encountered for policy [${failedPolicy.packagePolicy.id}]. Retrying update...`
                );

                // retrieve latest policy - but don't error case it was deleted
                inflightRequests.add(
                  this.packagePolicyService
                    .get(
                      savedObjects.createInternalScopedSoClient({ spaceId }),
                      failedPolicy.packagePolicy.id,
                      { spaceId }
                    )
                    .then((latestPolicy) => {
                      if (!latestPolicy) {
                        response.failedPolicies.push(failedPolicy);
                        return;
                      }

                      set(
                        latestPolicy,
                        'inputs[0].config.artifact_manifest.value',
                        failedPolicy.packagePolicy.inputs[0]?.config?.artifact_manifest?.value
                      );

                      this.logger.debug(
                        () =>
                          `Sending retry update for policy [${latestPolicy.id}]:\n${stringify(
                            latestPolicy,
                            20
                          )}`
                      );

                      policyUpdateBatchProcessor.addToQueue(latestPolicy);
                    })
                    .catch((err) => {
                      // If unable to get latest version of policy (ex. policy was deleted), then just report update as a failure
                      this.logger.debug(
                        () =>
                          `Failed to retrieve policy [${failedPolicy.packagePolicy.id}] for space [${spaceId}] in order to retry policy update. Retry will be skipped:\n${err.message}`
                      );

                      response.failedPolicies.push(failedPolicy);
                    })
                );
              } else {
                updateErrors.push(failedPolicy);
              }
            }

            response.failedPolicies.push(...(updateErrors ?? []));
          }

          if (!isEmpty(response.failedPolicies)) {
            errors.push(
              ...response.failedPolicies.map((failedPolicy) => {
                if (failedPolicy.error instanceof Error) {
                  return failedPolicy.error;
                } else {
                  this.logger.debug(`Update failure:\n${stringify(failedPolicy.error)}`);

                  return new EndpointError(failedPolicy.error.message, failedPolicy.error);
                }
              })
            );
          }

          if (response.updatedPolicies) {
            updatedPolicies.push(
              ...response.updatedPolicies.map((policy) => {
                return `[${policy.id}][${policy.name}] updated with manifest version: [${manifestVersion}]`;
              })
            );
          }
        } catch (err) {
          errors.push(new EndpointError(`packagePolicy.bulkUpdate error: ${err.message}`, err));
        }
      },
    });

    const isNewManifestVersionGreaterThanPolicyManifestVersion = (
      policyManifestVersion: string
    ): boolean => {
      try {
        return semver.gt(manifestVersion, policyManifestVersion);
      } catch (e) {
        this.logger.debug(
          () =>
            `Failed to validate if new manifest version [${manifestVersion}] is great than policy Manifest Version [${policyManifestVersion}]:\n${stringify(
              e
            )}`
        );

        // If unable to perform version check - assume new manifest version
        // is greater than the version from the policy
        return true;
      }
    };

    for await (const _policies of await this.fetchAllPolicies()) {
      const policies = _policies as PolicyData[];

      for (const packagePolicy of policies) {
        const { id: policyId, name, spaceIds = [DEFAULT_SPACE_ID] } = packagePolicy;

        this.logger.debug(
          () =>
            `Checking if policy [${policyId}][${name}] in space(s) [${spaceIds.join(
              ', '
            )}] needs to be updated with new artifact manifest`
        );

        try {
          if (packagePolicy.inputs.length > 0 && packagePolicy.inputs[0].config !== undefined) {
            const oldManifest: ManifestSchema | undefined =
              packagePolicy.inputs[0].config?.artifact_manifest?.value;

            this.logger.debug(
              () =>
                `Policy [${policyId}][${name}] currently has manifest version [${oldManifest?.manifest_version}]`
            );

            if (
              isNewManifestVersionGreaterThanPolicyManifestVersion(oldManifest?.manifest_version)
            ) {
              const serializedManifest = manifest.toPackagePolicyManifest(policyId);

              if (!manifestDispatchSchema.is(serializedManifest)) {
                errors.push(
                  new EndpointError(
                    `Invalid manifest for policy ${policyId}. The new generated manifest did not pass schema validation`,
                    serializedManifest
                  )
                );
              } else if (!oldManifest || !manifestsEqual(serializedManifest, oldManifest)) {
                packagePolicy.inputs[0].config.artifact_manifest = { value: serializedManifest };
                policyUpdateBatchProcessor.addToQueue(packagePolicy);
              } else {
                unChangedPolicies.push(`[${policyId}][${name}] No change in manifest content`);
              }
            } else {
              unChangedPolicies.push(`[${policyId}][${name}] No change in manifest version`);
            }
          } else {
            errors.push(
              new EndpointError(
                `Package Policy ${policyId} has no 'inputs[0].config'`,
                packagePolicy
              )
            );
          }
        } catch (e) {
          errors.push(
            new EndpointError(
              `Error thrown while processing policy [${policyId}][${name}]:\n${stringify(e)}`,
              e
            )
          );
        }
      }
    }

    await policyUpdateBatchProcessor.complete();

    // Since processing of batches could have triggered a retry update, ensure we wait for those to process
    await Promise.allSettled(inflightRequests).then(() => policyUpdateBatchProcessor.complete());

    this.logger.debug(
      `Processed [${updatedPolicies.length + unChangedPolicies.length}] Policies: updated: [${
        updatedPolicies.length
      }], un-changed: [${unChangedPolicies.length}]`
    );

    if (updatedPolicies.length) {
      this.logger.debug(`Updated Policies:\n  ${updatedPolicies.join('\n  ')}`);
    }

    if (unChangedPolicies.length) {
      this.logger.debug(`Un-changed Policies:\n  ${unChangedPolicies.join('\n  ')}`);
    }

    return errors;
  }

  /**
   * Commits a manifest to indicate that a new version has been computed.
   *
   * @param manifest The Manifest to commit.
   * @returns {Promise<Error | null>} An error, if encountered, or null.
   */
  public async commit(manifest: Manifest) {
    const manifestSo = manifest.toSavedObject();

    await this.commitUnified(manifestSo);
  }

  private fetchAllPolicies(): Promise<AsyncIterable<PackagePolicy[]>> {
    return this.packagePolicyService.fetchAllItems(this.savedObjectsClient, {
      kuery: 'ingest-package-policies.package.name:endpoint',
      spaceIds: ['*'],
    });
  }

  private async listEndpointPolicyIds(): Promise<string[]> {
    const allPolicyIds: string[] = [];
    const idFetcher = await this.packagePolicyService.fetchAllItemIds(this.savedObjectsClient, {
      kuery: 'ingest-package-policies.package.name:endpoint',
      spaceIds: ['*'],
    });

    for await (const itemIds of idFetcher) {
      allPolicyIds.push(...itemIds);
    }

    this.logger.debug(
      () =>
        `Retrieved [${allPolicyIds.length}] endpoint integration policy IDs:\n${stringify(
          allPolicyIds
        )}`
    );

    return allPolicyIds;
  }

  public getArtifactsClient(): EndpointArtifactClientInterface {
    return this.artifactClient;
  }

  /**
   * Retrieves all .fleet-artifacts for endpoint package
   * @returns Artifact[]
   */
  private async listAllArtifacts(): Promise<Artifact[]> {
    const fleetArtifacts: Artifact[] = [];
    let total = 0;

    for await (const artifacts of this.artifactClient.fetchAll()) {
      fleetArtifacts.push(...artifacts);
      total += artifacts.length;
    }

    this.logger.debug(`Count of current stored artifacts: ${total}`);

    return fleetArtifacts;
  }

  /**
   * Pulls in all artifacts from Fleet and checks to ensure they are all being referenced
   * by the Manifest. If any are found to not be in the current Manifest (orphan), they
   * are cleaned up (deleted)
   */
  public async cleanup(manifest: Manifest) {
    const badArtifactIds: string[] = [];
    const errors: string[] = [];
    const artifactDeletionProcess = new QueueProcessor<string>({
      batchSize: this.packagerTaskPackagePolicyUpdateBatchSize,
      logger: this.logger,
      key: 'cleanup',
      batchHandler: async ({ batch, data }) => {
        const deleteErrors = await this.artifactClient.bulkDeleteArtifacts(data);

        badArtifactIds.push(...data);

        if (deleteErrors.length) {
          errors.push(
            `Delete batch #[${batch}] with [${data.length}] items:\n${stringify(deleteErrors)}`
          );
        }
      },
    });

    const validArtifactIds = manifest.getAllArtifacts().map((artifact) => getArtifactId(artifact));

    for await (const artifacts of this.artifactClient.fetchAll()) {
      for (const artifact of artifacts) {
        const artifactId = getArtifactId(artifact);
        const isArtifactInManifest = validArtifactIds.includes(artifactId);

        if (!isArtifactInManifest) {
          artifactDeletionProcess.addToQueue(artifactId);
        }
      }
    }

    await artifactDeletionProcess.complete();

    if (errors.length > 0) {
      this.logger.error(
        `The following errors were encountered while attempting to delete [${
          badArtifactIds.length
        }] orphaned artifacts:\n${stringify(errors)}`
      );
    } else if (badArtifactIds.length > 0) {
      this.logger.debug(
        `Count of orphan artifacts cleaned up: ${badArtifactIds.length}\n${stringify(
          badArtifactIds
        )}`
      );
    }
  }

  /**
   * Unified Manifest methods
   */

  private setNewSemanticVersion(semanticVersion: string): string | null {
    const newSemanticVersion = semver.inc(semanticVersion, 'patch');
    if (!semver.valid(newSemanticVersion)) {
      throw new Error(`Invalid semver: ${newSemanticVersion}`);
    }
    return newSemanticVersion;
  }

  protected getUnifiedManifestClient(): UnifiedManifestClient {
    return new UnifiedManifestClient(this.savedObjectsClient);
  }

  public async getAllUnifiedManifestsSO(): Promise<InternalUnifiedManifestSchema[]> {
    return this.getUnifiedManifestClient().getAllUnifiedManifests();
  }

  public transformUnifiedManifestSOtoLegacyManifestSO(
    unifiedManifestsSo: InternalUnifiedManifestSchema[],
    semanticVersion?: string
  ): {
    version: string;
    attributes: {
      artifacts: Array<
        { artifactId: string; policyId: undefined } | { artifactId: string; policyId: string }
      >;
      semanticVersion: string;
      schemaVersion: ManifestSchemaVersion;
    };
  } {
    const globalUnifiedManifest = unifiedManifestsSo.find((a) => a.policyId === '.global');
    return {
      version: 'WzQ3NzAsMV0=', // version is hardcoded since it was used only to determine whether to create a new manifest or update an existing one
      attributes: {
        artifacts: [
          ...(globalUnifiedManifest?.artifactIds.map((artifactId) => ({
            artifactId,
            policyId: undefined,
          })) ?? []),
          ...unifiedManifestsSo.reduce(
            (acc: Array<{ artifactId: string; policyId: string }>, unifiedManifest) => {
              if (unifiedManifest.policyId === '.global') {
                return acc;
              }
              acc.push(
                ...unifiedManifest.artifactIds.map((artifactId) => ({
                  policyId: unifiedManifest.policyId,
                  artifactId,
                }))
              );

              return acc;
            },
            []
          ),
        ],
        semanticVersion: (semanticVersion || globalUnifiedManifest?.semanticVersion) ?? '1.0.0',
        schemaVersion: this.schemaVersion,
      },
    };
  }

  public transformLegacyManifestSOtoUnifiedManifestSO(
    manifestSo: InternalManifestSchema,
    unifiedManifestsSo: InternalUnifiedManifestSchema[]
  ): Array<InternalUnifiedManifestBaseSchema & { id?: string }> {
    const manifestObject = manifestSo.artifacts.reduce(
      (
        acc: Record<string, InternalUnifiedManifestBaseSchema & { id?: string }>,
        { artifactId, policyId = '.global' }
      ) => {
        const existingPolicy = acc[policyId];
        if (existingPolicy) {
          existingPolicy.artifactIds.push(artifactId);
        } else {
          const existingUnifiedManifestSo = unifiedManifestsSo.find(
            (item) => item.policyId === policyId
          );

          // On first run, there will be no existing Unified Manifests SO, so we need to copy the semanticVersion from the legacy manifest
          // This is to ensure that the first Unified Manifest created has the same semanticVersion as the legacy manifest and is not too far
          // behind for package policy to pick it up.
          const semanticVersion =
            (policyId === '.global' && !unifiedManifestsSo.length
              ? manifestSo?.semanticVersion
              : existingUnifiedManifestSo?.semanticVersion) ?? '1.0.0';

          acc[policyId] = {
            policyId,
            artifactIds: [artifactId],
            semanticVersion,
            id: existingUnifiedManifestSo?.id,
          };
        }
        return acc;
      },
      {}
    );
    return Object.values(manifestObject);
  }

  public prepareUnifiedManifestsSOUpdates(
    unifiedManifestsSo: Array<Omit<InternalUnifiedManifestUpdateSchema, 'id'> & { id?: string }>,
    existingUnifiedManifestsSo: InternalUnifiedManifestSchema[]
  ) {
    const existingManifestsObj: Record<string, InternalUnifiedManifestSchema> = {};
    existingUnifiedManifestsSo.forEach((manifest) => {
      existingManifestsObj[manifest.id] = manifest;
    });

    const { unifiedManifestsToUpdate, unifiedManifestsToCreate } = unifiedManifestsSo.reduce(
      (
        acc: {
          unifiedManifestsToUpdate: InternalUnifiedManifestUpdateSchema[];
          unifiedManifestsToCreate: InternalUnifiedManifestBaseSchema[];
        },
        unifiedManifest
      ) => {
        if (unifiedManifest.id !== undefined) {
          // Manifest with id exists in SO, check if it needs to be updated
          const existingUnifiedManifest = existingManifestsObj[unifiedManifest.id];
          // Update SO if the artifactIds changed.
          if (!isEqual(existingUnifiedManifest.artifactIds, unifiedManifest.artifactIds)) {
            acc.unifiedManifestsToUpdate.push({
              ...unifiedManifest,
              semanticVersion: this.setNewSemanticVersion(unifiedManifest.semanticVersion),
              version: existingUnifiedManifest.version,
            } as InternalUnifiedManifestUpdateSchema);
          }
        } else {
          // Manifest with id does not exist in SO, create new SO
          acc.unifiedManifestsToCreate.push(unifiedManifest);
        }

        return acc;
      },
      { unifiedManifestsToUpdate: [], unifiedManifestsToCreate: [] }
    );

    const unifiedManifestsToDelete = existingUnifiedManifestsSo.reduce(
      (acc: string[], { policyId, id }) => {
        const existingPolicy = unifiedManifestsSo.find((item) => item.policyId === policyId);
        if (!existingPolicy) {
          acc.push(id);
        }
        return acc;
      },
      []
    );

    return { unifiedManifestsToUpdate, unifiedManifestsToCreate, unifiedManifestsToDelete };
  }

  public async bumpGlobalUnifiedManifestVersion(): Promise<void> {
    const globalUnifiedManifestSO =
      await this.getUnifiedManifestClient().getUnifiedManifestByPolicyId('.global');
    if (!globalUnifiedManifestSO?.saved_objects?.length) {
      this.logger.warn('No Global Unified Manifest found to bump version');
      return;
    }
    const globalUnifiedManifest = globalUnifiedManifestSO.saved_objects[0];

    const newSemanticVersion =
      this.setNewSemanticVersion(globalUnifiedManifest.attributes.semanticVersion) || '1.0.0';
    await this.getUnifiedManifestClient().updateUnifiedManifest({
      ...globalUnifiedManifest.attributes,
      id: globalUnifiedManifest.id,
      semanticVersion: newSemanticVersion,
    });
  }

  public async commitUnified(manifestSo: InternalManifestSchema): Promise<void> {
    const existingUnifiedManifestsSo = await this.getAllUnifiedManifestsSO();

    const unifiedManifestSO = this.transformLegacyManifestSOtoUnifiedManifestSO(
      manifestSo,
      existingUnifiedManifestsSo
    );

    const { unifiedManifestsToUpdate, unifiedManifestsToCreate, unifiedManifestsToDelete } =
      this.prepareUnifiedManifestsSOUpdates(unifiedManifestSO, existingUnifiedManifestsSo);

    if (unifiedManifestsToCreate.length) {
      await asyncForEach(chunk(unifiedManifestsToCreate, 100), async (unifiedManifestsBatch) => {
        await this.getUnifiedManifestClient().createUnifiedManifests(unifiedManifestsBatch);
      });
      this.logger.debug(`Created ${unifiedManifestsToCreate.length} unified manifests`);
    }

    if (unifiedManifestsToUpdate.length) {
      await asyncForEach(chunk(unifiedManifestsToUpdate, 100), async (unifiedManifestsBatch) => {
        await this.getUnifiedManifestClient().updateUnifiedManifests(unifiedManifestsBatch);
      });

      this.logger.debug(`Updated ${unifiedManifestsToUpdate.length} unified manifests`);
    }

    if (unifiedManifestsToDelete.length) {
      await asyncForEach(chunk(unifiedManifestsToDelete, 100), async (unifiedManifestsBatch) => {
        await this.getUnifiedManifestClient().deleteUnifiedManifestByIds(unifiedManifestsBatch);
      });

      this.logger.debug(`Deleted ${unifiedManifestsToDelete.length} unified manifests`);
    }

    if (
      unifiedManifestsToCreate.length ||
      unifiedManifestsToUpdate.length ||
      unifiedManifestsToDelete.length
    ) {
      // If global manifest is not in the list of manifests to create or update, we need to bump its version
      // We use it to set schemaVersion of the legacy manifest we are going to create so that its being picked up when populating agent policy
      const hasGlobalManifest = [...unifiedManifestsToCreate, ...unifiedManifestsToUpdate].some(
        (manifest) => manifest.policyId === '.global'
      );

      if (!hasGlobalManifest || unifiedManifestsToDelete.length) {
        await this.bumpGlobalUnifiedManifestVersion();
      }
    }
  }
}
