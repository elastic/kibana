# @kbn/experimental-features

This package hosts all the experimental features flags for the Kibana Security Solution plugin.

## Purpose

The package exists to have all the feature flag logic collocated in a single place. It also allows us to avoid circular
dependencies between the Security Solution plugin and other packages that the plugin would be using.

## Package API

The package exposes the following:

- `allowedExperimentalValues` - an object containing all the allowed experimental feature flags
- `useIsExperimentalFeatureEnabled` - a hook to retrieve the value of a specific experimental feature flag. It will
  throw an error if the flag is not defined in `allowedExperimentalValues`.
- `ExperimentalFeaturesService` - a service to retrieve the experimental feature flags (primarily used in Jest tests)
- `ExperimentalFeatures` - a type representing the experimental feature flag
- `parseExperimentalConfigValue` - a utility function to help merging the allowed experimental feature flags with some
  from a config