#!/bin/bash

TZ="Etc/UTC" pnpm test:jest -c "$(dirname "${BASH_SOURCE[0]}")/jest.config.js"
