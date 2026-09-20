import type HtmlRspackPlugin from '../typings';

type Equal<A, B> =
  (<T>() => T extends A ? 1 : 2) extends <T>() => T extends B ? 1 : 2
    ? true
    : false;
type Assert<T extends true> = T;

type Options = HtmlRspackPlugin.Options;
type ProcessedOptions = HtmlRspackPlugin.ProcessedOptions;

// Runtime tests cannot detect options degrading to any. Check a named option
// and keep minify optional to guard against regressions in ProcessedOptions.
export type ProcessedOptionsAssertions = [
  Assert<Equal<ProcessedOptions['title'], string>>,
  Assert<Equal<Pick<ProcessedOptions, 'minify'>, Pick<Options, 'minify'>>>,
];
