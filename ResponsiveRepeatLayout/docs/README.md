# ResponsiveRepeatLayout Notes

`ResponsiveRepeatLayout` is stored in this repository as a paired SWE-bench task:

- `answer/`: the reference HarmonyOS project with the complete multi-device adaptation.
- `swe/`: the SWE-bench task project with the multi-device adaptation code removed.
- `docs/`: design notes, test plans, and maintenance documentation for this paired task.

Keep test assets and non-solution metadata in `answer/` and `swe/` aligned unless a test intentionally distinguishes the reference project from the task project. Put explanatory documents in this `docs/` directory instead of duplicating them inside either project.

From `harmonyos-ohostest-runner/`, run the matrix runner by pointing `--project` at the project variant you want to validate:

```bash
npm run ohostest:matrix -- --project ../ResponsiveRepeatLayout/answer
npm run ohostest:matrix -- --project ../ResponsiveRepeatLayout/swe
```
