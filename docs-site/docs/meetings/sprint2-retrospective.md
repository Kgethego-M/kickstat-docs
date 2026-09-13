---
sidebar_position: 7
---

# Sprint 2 Retrospective

**Date:** [DATE]
**Attendees:** [All team members]

## What went well

- Live match logging came together quickly — the timeline UI is intuitive and the backend handles undo cleanly.
- League and tournament system exceeded the brief's requirements — auto-generated fixtures, live standings, and top scorers.
- Backend test coverage stayed above 76% throughout the sprint.
- External integrations (weather, football-data) were straightforward to implement with the caching layer.
- CI/CD pipeline caught several regressions before they reached main.

## What could improve

- Frontend testing was left too late — should have been set up alongside backend tests in Sprint 1.
- Stakeholder review meetings should have been scheduled earlier in the sprint, not at the end.
- The Gitea issue tracker was not used consistently — most coordination happened via WhatsApp.
- Documentation was often written after implementation rather than alongside it.

## Action items for Sprint 3

| # | Action | Owner |
|---|--------|-------|
| 1 | Write tests alongside feature code, not after | All |
| 2 | Schedule client review in the first week of each sprint | [name] |
| 3 | Create Gitea issues before starting work, reference in commits | All |
| 4 | Update documentation as part of the Definition of Done | All |
| 5 | Conduct user testing before Sprint 3 midpoint | [name] |