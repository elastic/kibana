KIBANA_REPO       = $(shell git rev-parse --show-toplevel)
NODE_VERSION      = $(shell cat ${KIBANA_REPO}/.node-version)

KIBANA_VERSION   ?= latest
NETWORK          ?= apm-integration-testing
PORT             ?= 5601

DOCKER_IMAGE      = kibana-dev:${KIBANA_VERSION}
DOCKER_BUILD_ARGS = --build-arg NODE_VERSION="${NODE_VERSION}" -t ${DOCKER_IMAGE} .
DOCKER_RUN_ARGS   = --rm -p ${PORT}:5601 -p 9229-9231:9229-9231/tcp -v ${KIBANA_REPO}:/kibana/src -it ${DOCKER_IMAGE}

.PHONY: build build-nocache run run-networkless

build:
	docker build ${DOCKER_BUILD_ARGS}

build-nocache:
	docker build --no-cache ${DOCKER_BUILD_ARGS}

run:
	docker run --network ${NETWORK} ${DOCKER_RUN_ARGS}

run-networkless:
	docker run ${DOCKER_RUN_ARGS}
