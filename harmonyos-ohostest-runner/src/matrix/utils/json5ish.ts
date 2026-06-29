export function parseJson5ish(text: string): unknown {
  const withoutBlockComments = text.replace(/\/\*[\s\S]*?\*\//g, "");
  const withoutLineComments = withoutBlockComments.replace(/(^|[^:])\/\/.*$/gm, "$1");
  const withoutTrailingCommas = withoutLineComments.replace(/,(\s*[}\]])/g, "$1");
  return JSON.parse(withoutTrailingCommas);
}
