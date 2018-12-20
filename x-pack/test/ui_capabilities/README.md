Here's what we wanna test for the different configurations for NavLinks

# Security and Spaces

We want to test for all combinations of the following users at the following spaces. The goal of these tests is to ensure that ui capabilities can be disabled by either the privileges at a specific space, or the space disabling the features.

## Users
anonymous user - don't know if we need this, we'll need to add it
user with no kibana privileges - don't know if we need this, we'll need to add it
superuser
legacy all
legacy read
dual privileges all
dual privileges read
global read
global all
everything_space read
everything_space all
nothing_space read
nothing_space all

## Spaces
everything_space - all features enabled
nothing_space - no features enabled

# Security

## Users
anonymous user - don't know if we need this, we'll need to add it
user with no kibana privileges - don't know if we need this, we'll need to add it
superuser
legacy all
legacy read
dual privileges all
dual privileges read
global read
global all
everything_space read
everything_space all
nothing_space read
nothing_space all
global apm all
global apm read
global canvas all
global canvas read
global dashboard all
global dashboard read
global dev_tools all
global dev_tools read
global discover all
global discover read
global graph all
global graph read
global infrastructure all
global infrastructure read
global logging all
global logging read
global management all
global management read
global monitoring all
global monitoring read
global ml all
global ml read
global timelion all
global timelion read
global visualize all
global visualize read

# Spaces

## Spaces
default space with discover visible
space_1 with discover hidden
