#!/usr/bin/env bash

# Exit on use of undefined variables and on command failures.
set -eu

die() {
    if [[ "$@" ]]; then
        echo -e "$@\n" >&2
    fi
    exit 1
}

usage() {
  die "Usage: $0 <files>\n" \
  "\n" \
  "The data files are imported into the local ES instance (localhost:9200).\n" \
  "The naming convention is that the first part (before -data...) is the index name.\n"
  "\n" \
  "You need to put the credentials into the ELASTIC_LOCAL_CREDENTIALS env var (...=\"user:pw\")"
}

import() {
  local index=$1
  local path=$2
  local dir=${path%$file}

  if [[ "$dir" == "" ]]; then
    dir="."
  fi

  pushd "$dir"
  docker run --rm -ti --net=host -v "$PWD:/data" elasticdump/elasticsearch-dump:latest \
    --input="/data/$file" \
    --output="http://admin:changeme@localhost:9200/$index" \
    --type=data --fsCompress --noRefresh --support-big-int --limit=10000
  popd
}

while [[ $# -gt 0 ]]; do
  path=$1
  file=${1##*/}
  index=${file%-data*}

  import "$index" "$path"
  shift
done
