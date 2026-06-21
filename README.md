# Exception Tracking System

## Architecture Decisions

While the reference stack suggested FastAPI/PostgreSQL/Celery, this implementation uses Express with equivalent modular services.

Workflow processing, risk evaluation, alert generation, and reporting remain completely decoupled and deterministic.

The architecture preserves the same separation of concerns while optimizing development velocity during the hackathon.
