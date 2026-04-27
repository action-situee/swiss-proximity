install:
	npm run install:frontend

dev:
	npm run dev

build:
	npm run build

test:
	npm run test

lint:
	npm run lint

lint-check:
	npm run lint:check

type-check:
	npm run type-check

preview:
	npm run preview

# Legacy Docker commands (kept for compatibility)
run:
	docker-compose build --pull
	docker-compose up --remove-orphans -d

# Data processing
process:
	$(MAKE) -C data_processing process

.PHONY: install dev build test lint lint-check type-check preview run process
