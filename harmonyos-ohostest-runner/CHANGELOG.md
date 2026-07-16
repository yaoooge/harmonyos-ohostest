# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [0.1.1] - 2026-07-16

### Fixed

- Uninstall the configured application bundle before installing app and test HAPs, preventing HDC error `9568267` (`install entry already exist`) when the same bundle is installed repeatedly on one device.
- Ignore pre-install uninstall failures so first-time installation continues when the bundle is not present.
