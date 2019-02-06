# UI Capability Tests
These tests give us the most coverage to ensure that spaces and security work indepedently and cooperatively. They each cover different situations, and are supplemented by functional UI tests to ensure that security and spaces independently are able to disable the UI elements.

## Security and Spaces

We want to test for all combinations of the following users at the following spaces. The goal of these tests is to ensure that ui capabilities can be disabled by either the privileges at a specific space, or the space disabling the features.

### Users
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

### Spaces
everything_space - all features enabled
nothing_space - no features enabled

## Security

The security tests focus on more permutations of user's privileges, and focus primarily on privileges granted globally (at all spaces).

### Users
no kibana privileges
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
global maps all
global maps read
global ml all
global ml read
global monitoring all
global monitoring read
global timelion all
global timelion read
global uptime all
global visualize all
global visualize read

## Spaces

The Space tests focus on the result of disabling certain feature(s).

### Spaces
everything enabled
nothing enabled
advanced settings disabled
apm disabled
canvas disabled
dashboard disabled
dev_tools disabled
discover disabled
graph disabled
infrastructure disabled
logs disabled
ml disabled
monitoring disabled
timelion disabled
uptime disabled
visualize disabled
