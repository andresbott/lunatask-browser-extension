PROJECT_NAME := lunatask-extension
VERSION := $(shell node -p "require('./package.json').version")

default: help

#==========================================================================================
##@ Development
#==========================================================================================

install: ## install dependencies
	@npm install

dev: ## start development build with watch mode
	@npm run dev

#==========================================================================================
##@ Building
#==========================================================================================

build: ## build extension for Chrome
	@npm run build

build-firefox: ## build extension for Firefox
	@npm run build:firefox

build-all: build build-firefox ## build for all browsers

#==========================================================================================
##@ Quality
#==========================================================================================

lint: ## run ESLint
	@npm run lint

typecheck: ## run TypeScript type checking
	@npm run typecheck

check: lint typecheck ## run all quality checks

#==========================================================================================
##@ Packaging
#==========================================================================================

package: build ## create Chrome extension zip for distribution
	@mkdir -p releases
	@cd dist && zip -r ../releases/$(PROJECT_NAME)-chrome-v$(VERSION).zip .
	@echo "Created: releases/$(PROJECT_NAME)-chrome-v$(VERSION).zip"

package-firefox: build-firefox ## create Firefox extension zip for distribution
	@mkdir -p releases
	@cd dist-firefox && zip -r ../releases/$(PROJECT_NAME)-firefox-v$(VERSION).zip .
	@echo "Created: releases/$(PROJECT_NAME)-firefox-v$(VERSION).zip"

package-all: package package-firefox ## create zips for all browsers

#==========================================================================================
##@ Clean
#==========================================================================================

clean: ## remove build artifacts
	@rm -rf dist dist-firefox

clean-all: clean ## remove all generated files
	@rm -rf node_modules releases

#==========================================================================================
##@ Help
#==========================================================================================

.PHONY: help
help: ## display this help
	@awk 'BEGIN {FS = ":.*##"; printf "\nUsage:\n  make \033[36m<target>\033[0m\n"} /^[a-zA-Z_0-9-]+:.*?##/ { printf "  \033[36m%-18s\033[0m %s\n", $$1, $$2 } /^##@/ { printf "\n\033[1m%s\033[0m\n", substr($$0, 5) } ' $(MAKEFILE_LIST)

.PHONY: install dev build build-firefox build-all lint typecheck check package package-firefox package-all clean clean-all
