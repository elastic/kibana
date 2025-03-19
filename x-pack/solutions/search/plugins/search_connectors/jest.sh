#!/bin/bash

TZ="Etc/UTC" yarn test:jest -c "$(dirname "${BASH_SOURCE[0]}")/jest.config.js"
